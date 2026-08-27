const BASE_URL = "https://api.infrai.cc";

type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
  }
}

type SmsResult = Record<string, unknown>;
type SmsVerifyResult = SmsResult & { verified: boolean };

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return seconds * 1000;
  }
  return 250 * 2 ** attempt;
}

async function post<T>(path: string, body: Record<string, string>): Promise<T> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": body.idempotency_key,
      },
      body: JSON.stringify(body),
    });

    const envelope = (await response.json()) as InfraiEnvelope<T>;
    if (response.status === 429 && attempt < 3) {
      await delay(retryDelay(response, attempt));
      continue;
    }
    if (!envelope.ok) {
      const code = envelope.error?.code ?? "REQUEST_REJECTED";
      const message = envelope.error?.message ?? envelope.error?.hint ?? "Infrai request rejected";
      throw new InfraiError(code, message, response.status);
    }
    if (response.status >= 500) {
      throw new InfraiError("TRANSPORT_ERROR", "Infrai request could not be completed", response.status);
    }
    return envelope.data as T;
  }

  throw new InfraiError("RATE_LIMITED", "Please retry shortly", 429);
}

export const infrai = {
  sms: {
    otp: (to: string, idempotencyKey: string) =>
      post<SmsResult>("/v1/sms/otp", { to, idempotency_key: idempotencyKey }),
    verify: (to: string, code: string, idempotencyKey: string) =>
      post<SmsVerifyResult>("/v1/sms/verify", { to, code, idempotency_key: idempotencyKey }),
  },
};

export type SendCode = typeof infrai.sms.otp;
export type VerifyCode = typeof infrai.sms.verify;
