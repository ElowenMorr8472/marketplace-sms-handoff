import { createServer } from "node:http";
import { ZodError } from "zod";
import { infrai, InfraiError } from "./infrai_sms";
import { buyerUpdate, confirmOrderHandoff, sendLoginCode, verifyHandoff } from "./order_handoff";

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function clientStatus(error: InfraiError): number {
  return error.status >= 400 && error.status < 500 ? error.status : 502;
}

export const server = createServer(async (request, response) => {
  response.setHeader("content-type", "application/json");
  try {
    if (request.method === "POST" && request.url === "/login/code") {
      const input = buyerUpdate.parse(await readJson(request));
      response.end(JSON.stringify(await sendLoginCode(input, infrai.sms.otp)));
      return;
    }

    if (request.method === "POST" && request.url === "/orders/handoff") {
      const input = verifyHandoff.parse(await readJson(request));
      response.end(JSON.stringify(await confirmOrderHandoff(input, infrai.sms.verify)));
      return;
    }

    response.statusCode = 404;
    response.end(JSON.stringify({ error: "route_not_found" }));
  } catch (error) {
    if (error instanceof ZodError) {
      response.statusCode = 400;
      response.end(JSON.stringify({ error: "invalid_request", issues: error.issues }));
      return;
    }
    if (error instanceof InfraiError) {
      response.statusCode = clientStatus(error);
      response.end(JSON.stringify({ error: error.code, message: error.message }));
      return;
    }
    response.statusCode = 500;
    response.end(JSON.stringify({ error: "server_error" }));
  }
});

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => console.log(`Marketplace login listening on http://localhost:${port}`));
}
