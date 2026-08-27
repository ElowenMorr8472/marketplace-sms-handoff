import { z } from "zod";
import type { SendCode, VerifyCode } from "./infrai_sms";

export const sellerAssets = z.object({
  listingId: z.string().min(1),
  sellerId: z.string().min(1),
  assetKeys: z.array(z.string().min(1)).min(1),
});

export const buyerUpdate = z.object({
  orderId: z.string().min(1),
  buyerId: z.string().min(1),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
});

export const verifyHandoff = buyerUpdate.extend({
  code: z.string().regex(/^\d{4,8}$/),
  assets: sellerAssets,
});

export type BuyerUpdate = z.infer<typeof buyerUpdate>;
export type VerifyHandoff = z.infer<typeof verifyHandoff>;

export async function sendLoginCode(input: BuyerUpdate, sendCode: SendCode) {
  await sendCode(input.phone, `login:${input.orderId}:${input.buyerId}`);
  return { orderId: input.orderId, state: "code_sent" as const };
}

export async function confirmOrderHandoff(input: VerifyHandoff, verifyCode: VerifyCode) {
  const verification = await verifyCode(
    input.phone,
    input.code,
    `verify:${input.orderId}:${input.buyerId}`,
  );
  if (verification.verified !== true) {
    throw new Error("SMS code was not verified");
  }

  return {
    orderId: input.orderId,
    state: "ready_for_handoff" as const,
    recipient: input.buyerId,
    assets: input.assets.assetKeys,
  };
}
