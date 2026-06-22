import { Router } from "express";
import { ShipHeroClient } from "../connectors/shipheroClient.js";

export const shipheroRouter = Router();

const shipHero = new ShipHeroClient();

shipheroRouter.get("/account", async (_req, res, next) => {
  try {
    const account = await shipHero.getAccountWarehouses();
    res.json(account);
  } catch (error) {
    next(error);
  }
});
