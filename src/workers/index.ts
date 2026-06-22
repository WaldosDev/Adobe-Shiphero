import { Worker } from "bullmq";
import { redisConnection } from "../queue.js";
import { logger } from "../logger.js";
import { ShipHeroClient } from "../connectors/shipheroClient.js";
import { AdobeClient } from "../connectors/adobeClient.js";
import { alreadyProcessed, idempotencyKey, markProcessed } from "../services/idempotency.js";
import type { AdobeOrderPayload, InventoryPayload, TrackingPayload } from "../types/payloads.js";

const shipHero = new ShipHeroClient();
const adobe = new AdobeClient();

new Worker(
  "integration-events",
  async (job) => {
    if (await alreadyProcessed(job.id ?? job.name)) {
      logger.info({ jobId: job.id, jobName: job.name }, "Skipping duplicate job");
      return;
    }

    switch (job.name) {
      case "adobe.order.created":
        await shipHero.createOrder(job.data as AdobeOrderPayload);
        await markProcessed(job.id ?? idempotencyKey(["order", (job.data as AdobeOrderPayload).order_number]));
        break;

      case "shiphero.webhook.received":
        await processShipHeroWebhook(job.data);
        await markProcessed(job.id ?? idempotencyKey(["webhook", job.data?.id]));
        break;

      case "shiphero.inventory.sync":
        await adobe.updateInventory(job.data as InventoryPayload);
        await markProcessed(job.id ?? idempotencyKey(["inventory", (job.data as InventoryPayload).sku]));
        break;

      case "shiphero.tracking.sync":
        await adobe.registerShipment(job.data as TrackingPayload);
        await markProcessed(job.id ?? idempotencyKey(["shipment", (job.data as TrackingPayload).shipment_id]));
        break;

      default:
        throw new Error(`Unsupported job: ${job.name}`);
    }
  },
  { connection: redisConnection }
).on("failed", (job, error) => {
  logger.error({ jobId: job?.id, jobName: job?.name, error }, "Job failed");
});

async function processShipHeroWebhook(payload: any) {
  const event = payload.event ?? payload.name;

  if (event === "Shipment Update" || event === "shipment_update") {
    const tracking: TrackingPayload = {
      order_number: payload.order_number,
      shipment_id: payload.shipment_id ?? payload.id,
      carrier: payload.carrier,
      tracking_number: payload.tracking_number,
      tracking_url: payload.tracking_url,
      shipped_at: payload.shipped_at ?? new Date().toISOString(),
      items: payload.items ?? []
    };
    await adobe.registerShipment(tracking);
    return;
  }

  if (event === "Inventory Update" || event === "inventory_update") {
    const inventory: InventoryPayload = {
      sku: payload.sku,
      shiphero_warehouse: payload.warehouse,
      adobe_source: payload.adobe_source ?? payload.warehouse,
      on_hand: Number(payload.on_hand ?? 0),
      allocated: Number(payload.allocated ?? 0),
      available: Number(payload.available ?? 0),
      updated_at: payload.updated_at ?? new Date().toISOString()
    };
    await adobe.updateInventory(inventory);
    return;
  }

  logger.info({ event }, "Webhook stored without Adobe action");
}
