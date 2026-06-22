import express from "express";
import { pinoHttp } from "pino-http";
import { ZodError } from "zod";
import { config } from "./config.js";
import { ShipHeroRequestError } from "./connectors/shipheroClient.js";
import { logger } from "./logger.js";
import { adobeRouter } from "./routes/adobe.js";
import { shipheroRouter } from "./routes/shiphero.js";
import { shipheroWebhookRouter } from "./routes/shipheroWebhook.js";

const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(pinoHttp({ logger }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "middleware-adobe-shiphero" });
});

app.use("/api/adobe", adobeRouter);
app.use("/api/shiphero", shipheroRouter);
app.use("/webhooks/shiphero", shipheroWebhookRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: "invalid payload", details: error.flatten() });
    return;
  }

  if (error instanceof ShipHeroRequestError) {
    res.status(error.statusCode).json({
      error: "shiphero request failed",
      status_code: error.statusCode,
      details: error.errors?.map((item) => item.message) ?? []
    });
    return;
  }

  logger.error({ err: error }, "Unhandled API error");
  res.status(500).json({ error: "internal server error" });
});

app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, "Middleware API listening");
});
