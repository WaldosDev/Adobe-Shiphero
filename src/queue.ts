import { Queue } from "bullmq";
import { config } from "./config.js";
import type { QueueJobName } from "./types/payloads.js";

export const redisConnection = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  maxRetriesPerRequest: null
};

export const integrationQueue = new Queue("integration-events", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 4,
    backoff: {
      type: "exponential",
      delay: 60_000
    },
    removeOnComplete: 1000,
    removeOnFail: false
  }
});

export async function enqueueIntegrationEvent(name: QueueJobName, payload: unknown, jobId: string) {
  return integrationQueue.add(name, payload, { jobId });
}
