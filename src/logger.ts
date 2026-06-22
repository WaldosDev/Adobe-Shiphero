import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers['x-webhook-secret']",
      "*.token",
      "*.access_token",
      "*.bearerToken",
      "*.email",
      "*.phone"
    ],
    censor: "[REDACTED]"
  }
});
