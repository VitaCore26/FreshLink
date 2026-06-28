import { Router } from "express";
import type { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { requireDeviceApi } from "../lib/deviceGuard.js";

const router = Router();

const SB_URL =
  process.env.VITE_SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://wnuilvamhygkzupvfnxz.supabase.co";

const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.service_role ||
  process.env.SUPABASE_SERVICE_KEY ||
  "";

function getAdminClient() {
  return createClient(SB_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

router.get("/", async (req: Request, res: Response) => {
  if (requireDeviceApi(req)) {
    res.status(401).json({ ok: false, error: "Device non autorisé" });
    return;
  }
  if (!SERVICE_KEY) {
    res.status(500).json({ ok: false, error: "SUPABASE_SERVICE_ROLE_KEY manquante" });
    return;
  }
  const table = req.query["table"] as string | undefined;
  if (!table) {
    res.status(400).json({ ok: false, error: "table param manquante" });
    return;
  }
  try {
    const sb = getAdminClient();
    const { data, error } = await sb
      .from(table)
      .select("id, payload")
      .limit(20000);
    if (error) {
      res.status(500).json({ ok: false, error: `${error.message} (code: ${error.code})` });
      return;
    }
    res.json({ ok: true, data: data ?? [] });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

export default router;
