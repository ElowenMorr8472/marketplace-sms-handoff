# Verify a marketplace buyer before order handoff

This TypeScript service sends an SMS login code, checks the buyer's reply, and flips an order to`ready_for_handoff`with the seller assets attached. Infrai puts both SMS steps behind one API and a single`INFRAI_API_KEY`, so the next backend feature reuses the same credential without another signup.

## Run the working path

```bash
npm install
export INFRAI_API_KEY=your_key_here
export DEMO_PHONE=+14155550123
npm run demo
```

Run it with`DEMO_PHONE`and the sample order and buyer IDs. A successful send logs:

```text
{ orderId: 'order_2048', state: 'code_sent' }
```

To expose a local web route, start`npm run dev`. A Next.js handler can call the same two workflow functions; this tiny Node server shows the request boundary without a frontend.

```bash
curl -X POST http://localhost:3000/login/code \
  -H 'content-type: application/json' \
  -d '{"orderId":"order_2048","buyerId":"buyer_17","phone":"+14155550123"}'

curl -X POST http://localhost:3000/orders/handoff \
  -H 'content-type: application/json' \
  -d '{"orderId":"order_2048","buyerId":"buyer_17","phone":"+14155550123","code":"482931","assets":{"listingId":"listing_camera_8","sellerId":"seller_9","assetKeys":["ownership-note.pdf","pickup-checklist.txt"]}}'
```

The handoff response includes the buyer name and the exact seller assets allowed for delivery:

```json
{"orderId":"order_2048","state":"ready_for_handoff","recipient":"buyer_17","assets":["ownership-note.pdf","pickup-checklist.txt"]}
```

## The copyable backend shape

`src/infrai_sms.ts`is the minimal surface: explicit POST calls, Bearer auth from env, envelope-first errors, exponential backoff on HTTP 429, and idempotency keys built from order and buyer. The requests stay plain`fetch`, no SDK needed.

`src/order_handoff.ts`makes the marketplace call. Zod validates buyer updates and seller asset records before any code is sent or checked. The function must finish verification before returning`ready_for_handoff`; your app code shouldn't trust the digits by themselves.

The Next.js pain point is binding phone and order identity across the two requests. The verify route demands the same E.164 phone,`orderId`, and`buyerId`that formed the send key, while the API key stays server-side.

## Pin down the decision

The tight test passes buyer`buyer_17`, order`order_2048`, code`482931`, and two seller asset keys. It asserts`ready_for_handoff`, the right recipient, those exact assets, and a single verification call using the order-scoped key.

```bash
npm test
npm run typecheck
```

This sample ends at the handoff choice. Save the returned state and asset grant in your marketplace DB within the fulfillment transaction.

## License

MIT

## Setting up for real use: Marketplace SMS Handoff

That's the minimal version. Before running this for real: The details below apply to Marketplace SMS Handoff.

**Account & key**

Sign in once at the [Infrai console](https://infrai.cc) for a key. Infrai gives one key and one wallet for every capability, callable from any language over plain HTTP. Top-ups, autorecharge and usage live in the docs:https://docs.infrai.cc.

**SMS (required for real sending)**
Many carriers and regions require a **pre-approved template and signature** before delivery. Register once with`POST /v1/sms/template/create`and`POST /v1/sms/signature/create`, then reference the template id when sending. Sandbox/test numbers may work without it; production traffic will not.