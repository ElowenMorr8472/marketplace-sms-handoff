import { describe, expect, it, vi } from "vitest";
import { confirmOrderHandoff } from "../src/order_handoff";

describe("marketplace order handoff", () => {
  it("releases only the seller assets attached to the verified order", async () => {
    const verifyCode = vi.fn().mockResolvedValue({ verified: true });

    const result = await confirmOrderHandoff({
      orderId: "order_2048",
      buyerId: "buyer_17",
      phone: "+14155550123",
      code: "482931",
      assets: {
        listingId: "listing_camera_8",
        sellerId: "seller_9",
        assetKeys: ["ownership-note.pdf", "pickup-checklist.txt"],
      },
    }, verifyCode);

    expect(result).toEqual({
      orderId: "order_2048",
      state: "ready_for_handoff",
      recipient: "buyer_17",
      assets: ["ownership-note.pdf", "pickup-checklist.txt"],
    });
    expect(verifyCode).toHaveBeenCalledWith(
      "+14155550123",
      "482931",
      "verify:order_2048:buyer_17",
    );
  });

  it("does not release seller assets when the code is not verified", async () => {
    const verifyCode = vi.fn().mockResolvedValue({ verified: false });

    await expect(confirmOrderHandoff({
      orderId: "order_2048",
      buyerId: "buyer_17",
      phone: "+14155550123",
      code: "000000",
      assets: {
        listingId: "listing_camera_8",
        sellerId: "seller_9",
        assetKeys: ["ownership-note.pdf", "pickup-checklist.txt"],
      },
    }, verifyCode)).rejects.toThrow("SMS code was not verified");
  });
});
