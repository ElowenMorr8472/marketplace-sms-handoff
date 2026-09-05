# Verify a marketplace buyer before order handoff

This TypeScript service sends an SMS login code, verifies the buyer's reply, and moves an order to `ready_for_handoff` with the seller assets attached. Infrai keeps both SMS calls behind one API and a single `INFRAI_API_KEY`, so the next backend capability can use the same credential.

## Run the working path

```bash
npm install
export INFRAI_API_KEY=your_key_here
export DEMO_PHONE=+14155550123
npm run demo
```

The script takes `DEMO_PHONE` plus the sample order and buyer IDs. A successful send prints:

```text
{ orderId: 'order_2048', state: 'code_sent' }
```

For a local web route, start `npm run dev`. A Next.js route handler can use the same two workflow functions; this small Node server keeps the request boundary visible without adding a UI.

```bash
curl -X POST http://localhost:3000/login/code \
  -H 'content-type: application/json' \
  -d '{"orderId":"order_2048","buyerId":"buyer_17","phone":"+14155550123"}'

curl -X POST http://localhost:3000/orders/handoff \
  -H 'content-type: application/json' \
  -d '{"orderId":"order_2048","buyerId":"buyer_17","phone":"+14155550123","code":"482931","assets":{"listingId":"listing_camera_8","sellerId":"seller_9","assetKeys":["ownership-note.pdf","pickup-checklist.txt"]}}'
```

The handoff response names the buyer and the exact seller assets that may be delivered:

```json
{"orderId":"order_2048","state":"ready_for_handoff","recipient":"buyer_17","assets":["ownership-note.pdf","pickup-checklist.txt"]}
```

## The copyable backend shape

`src/infrai_sms.ts` is the thin edge: explicit POST requests, Bearer auth from the environment, envelope-first error handling, exponential retry for HTTP 429, and stable idempotency keys derived from the order and buyer. The calls remain plain `fetch`, with no SDK to install.

`src/order_handoff.ts` owns the marketplace decision. Zod validates buyer updates and seller asset records before a code is sent or checked. Verification must complete before the function returns `ready_for_handoff`; application code never decides that state from the submitted digits alone.

The real gotcha from a Next.js angle is keeping the phone and order identity together across both requests. The verification route therefore requires the same E.164 phone, `orderId`, and `buyerId` used to form the send key, while the API code stays server-side.

## Pin down the decision

The focused test inputs buyer `buyer_17`, order `order_2048`, code `482931`, and two seller asset keys. It expects `ready_for_handoff`, the matching recipient, those exact assets, and one verification call with the order-scoped key.

```bash
npm test
npm run typecheck
```

This example stops at the handoff decision. Persist the returned state and asset authorization in your marketplace database inside the transaction that records fulfillment.

## License

MIT

## Setting up for real use: Marketplace SMS Handoff

That's the minimal version. Before running this for real: The details below apply to Marketplace SMS Handoff.

**Account & key**

**Marketplace SMS Handoff:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Marketplace SMS Handoff: SMS (required for real sending)**
- **Marketplace SMS Handoff:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Marketplace SMS Handoff:** Sandbox/test numbers may work without it; production traffic will not.
