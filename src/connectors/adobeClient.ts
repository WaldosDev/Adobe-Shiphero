import { config } from "../config.js";
import { logger } from "../logger.js";
import type { InventoryPayload, TrackingPayload } from "../types/payloads.js";

export class AdobeClient {
  async registerShipment(payload: TrackingPayload) {
    if (config.DRY_RUN_EXTERNAL_APIS) {
      logger.info(
        { order_number: payload.order_number, shipment_id: payload.shipment_id },
        "Dry run: skipping Adobe shipment registration"
      );
      return { dry_run: true, order_number: payload.order_number, shipment_id: payload.shipment_id };
    }

    return this.post(`/rest/V1/order/${payload.order_number}/ship`, {
      shipment_id: payload.shipment_id,
      carrier: payload.carrier,
      tracking_number: payload.tracking_number,
      tracking_url: payload.tracking_url,
      shipped_at: payload.shipped_at,
      items: payload.items
    });
  }

  async updateInventory(payload: InventoryPayload) {
    if (config.DRY_RUN_EXTERNAL_APIS) {
      logger.info(
        { sku: payload.sku, adobe_source: payload.adobe_source, available: payload.available },
        "Dry run: skipping Adobe inventory update"
      );
      return { dry_run: true, sku: payload.sku, adobe_source: payload.adobe_source };
    }

    return this.post("/rest/V1/inventory/source-items", {
      sourceItems: [
        {
          sku: payload.sku,
          source_code: payload.adobe_source,
          quantity: payload.available,
          status: payload.available > 0 ? 1 : 0
        }
      ]
    });
  }

  private async post(path: string, body: unknown) {
    const response = await fetch(`${config.ADOBE_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.ADOBE_ACCESS_TOKEN}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error({ path, statusCode: response.status, response: text.slice(0, 500) }, "Adobe request failed");
      throw new Error("Adobe request failed");
    }

    return response.json().catch(() => ({}));
  }
}
