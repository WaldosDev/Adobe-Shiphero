import express from "express";
import { pinoHttp } from "pino-http";
import { ZodError } from "zod";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { adobeRouter } from "./routes/adobe.js";
import { shipheroWebhookRouter } from "./routes/shipheroWebhook.js";

const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(pinoHttp({ logger }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "middleware-adobe-shiphero" });
});

app.use("/api/adobe", adobeRouter);
app.use("/webhooks/shiphero", shipheroWebhookRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: "invalid payload", details: error.flatten() });
    return;
  }

  logger.error({ error }, "Unhandled API error");
  res.status(500).json({ error: "internal server error" });
});

app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, "Middleware API listening");
});
