import { Router } from "express";
import { config } from "../config.js";
import { enqueueIntegrationEvent } from "../queue.js";
import { idempotencyKey } from "../services/idempotency.js";

export const shipheroWebhookRouter = Router();

shipheroWebhookRouter.post("/", async (req, res, next) => {
  try {
    const secret = req.header("x-webhook-secret");
    if (secret !== config.WEBHOOK_SHARED_SECRET) {
      res.status(401).json({ error: "invalid webhook secret" });
      return;
    }

    const webhookId = req.header("x-shiphero-webhook-id") ?? req.body.webhook_id ?? req.body.id;
    const eventName = req.body.event ?? req.body.name ?? "unknown";
    const key = idempotencyKey(["webhook", webhookId, eventName]);

    await enqueueIntegrationEvent("shiphero.webhook.received", req.body, key);
    res.status(202).json({ accepted: true, request_id: key });
  } catch (error) {
    next(error);
  }
});
