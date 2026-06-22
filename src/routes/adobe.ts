import { Router } from "express";
import { z } from "zod";
import { enqueueIntegrationEvent } from "../queue.js";
import { idempotencyKey } from "../services/idempotency.js";

const orderSchema = z.object({
  order_number: z.string().min(1),
  source: z.string().min(1),
  warehouse: z.string().min(1),
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional()
  }),
  shipping_address: z.object({
    street1: z.string().min(1),
    street2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    postal_code: z.string().min(1),
    country: z.string().min(2)
  }),
  shipping_method: z.string().min(1),
  items: z.array(
    z.object({
      sku: z.string().min(1),
      quantity: z.number().int().positive(),
      name: z.string().optional()
    })
  ).min(1)
});

export const adobeRouter = Router();

adobeRouter.post("/orders", async (req, res, next) => {
  try {
    const payload = orderSchema.parse(req.body);
    const key = idempotencyKey(["order", payload.order_number]);

    await enqueueIntegrationEvent("adobe.order.created", payload, key);
    res.status(202).json({ accepted: true, request_id: key });
  } catch (error) {
    next(error);
  }
});
