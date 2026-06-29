import { Router } from "express";
import type { Request, Response } from "express";
import { readWebIntegrationConfig, writeWebIntegrationConfig, type WebIntegrationConfig } from "../../lib/ext/webIntegration.js";

// /ext/web-integration-config — persiste côté serveur la config "Intégration
// Site Web" (clé API, origines autorisées, options) gérée depuis BO →
// Paramètres → Intégration. Sans cette route la clé API générée par l'UI
// n'était jamais lue par aucune route serveur (bug signalé : clé décorative).

const router = Router();

router.use((req: Request, res: Response, next) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.sendStatus(204); return; }
  next();
});

router.get("/", async (_req: Request, res: Response) => {
  const cfg = await readWebIntegrationConfig();
  res.json({ ok: true, config: cfg });
});

router.post("/", async (req: Request, res: Response) => {
  const cfg = req.body as WebIntegrationConfig;
  if (!cfg || typeof cfg !== "object") { res.status(400).json({ ok: false, error: "config invalide" }); return; }
  const saved = await writeWebIntegrationConfig(cfg);
  if (!saved) { res.status(500).json({ ok: false, error: "échec de l'enregistrement (service-role manquante ?)" }); return; }
  res.json({ ok: true });
});

export default router;
