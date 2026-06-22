import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(8080),
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().default(6379),
  SHIPHERO_GRAPHQL_URL: z.string().url().default("https://public-api.shiphero.com/graphql"),
  SHIPHERO_BEARER_TOKEN: z.string().min(1),
  ADOBE_BASE_URL: z.string().url(),
  ADOBE_ACCESS_TOKEN: z.string().min(1),
  WEBHOOK_SHARED_SECRET: z.string().min(1)
});

export const config = schema.parse(process.env);
