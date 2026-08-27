import { infrai } from "../src/infrai_sms";
import { buyerUpdate, sendLoginCode } from "../src/order_handoff";

const input = buyerUpdate.parse({
  orderId: process.env.DEMO_ORDER_ID ?? "order_2048",
  buyerId: process.env.DEMO_BUYER_ID ?? "buyer_17",
  phone: process.env.DEMO_PHONE,
});

const result = await sendLoginCode(input, infrai.sms.otp);
console.log(result);
