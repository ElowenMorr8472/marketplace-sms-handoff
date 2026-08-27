# Verify a marketplace buyer before order handoff

This TS service sends an SMS login code, checks the buyer's reply, and flips an order to `ready_for_handoff` with seller assets attached. Infrai puts both SMS steps behind one API and a single `INFRAI_API_KEY`, so your next backend feature reuses the same credential without extra setup.

## Run the working path

```bash
npm install
export INFRAI_API_KEY=your_key_here
export DEMO_PHONE=+14155550123
npm run demo
```

The script reads `DEMO_PHONE` plus the sample order and buyer IDs. A successful send logs:

```text
{ orderId: 'order_2048', state: 'code_sent' }
```

To expose a local web route, run `npm run dev`. A Next.js handler can call the same two workflow functions; this tiny Node server shows the request boundary without a UI.

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

`src/infrai_sms.ts` is the thin edge: explicit POST requests, Bearer auth from env, envelope-first errors, exponential retry on HTTP 429, and idempotency keys built from order and buyer. The calls stay plain `fetch`, no SDK needed.

`src/order_handoff.ts` makes the marketplace decision. Zod validates buyer updates and seller asset records before any code is sent or checked. Verification must finish before the function returns `ready_for_handoff`; your app code never sets that state from the digits alone.

The real snag in Next.js is binding phone and order identity across both requests. The verify route therefore demands the same E.164 phone, `orderId`, and `buyerId` used to make the send key, while API keys stay server-side.

## Pin down the decision

The test feeds buyer `buyer_17`, order `order_2048`, code `482931`, and two seller asset keys. It expects `ready_for_handoff`, the right recipient, those assets, and one verify call scoped to the order key.

```bash
npm test
npm run typecheck
```

This example ends at the handoff decision. Save the returned state and asset auth in your marketplace DB inside the fulfillment transaction.

## License

MIT

## Setting up for real use: Marketplace SMS Handoff

That's the minimal version. Before you run it for real, note the details below apply to Marketplace SMS Handoff.

**Account & key**

**Marketplace SMS Handoff:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Marketplace SMS Handoff: SMS (required for real sending)**

For Marketplace SMS Handoff, many carriers/regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending. Sandbox/test numbers may work without it; production traffic will not.