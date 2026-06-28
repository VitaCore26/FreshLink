import { Router } from "express";
import type { Request, Response } from "express";
import {
  SADMIN_COOKIE,
  DEVICE_BYPASS,
  verifySadminToken,
} from "../../lib/deviceGuard.js";

const router = Router();

const SB_URL =
  process.env.VITE_SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://wnuilvamhygkzupvfnxz.supabase.co";

const SB_SRV =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.service_role ||
  process.env.SUPABASE_SERVICE_KEY ||
  "";

router.post("/session", (req: Request, res: Response) => {
  try {
    const { userId } = req.body as { userId?: string };
    if (!userId) {
      res.status(400).json({ ok: false, error: "userId requis" });
      return;
    }
    const token = DEVICE_BYPASS + ".sadmin";
    res.cookie(SADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

router.get("/session", (req: Request, res: Response) => {
  const token = (req.cookies as Record<string, string>)?.[SADMIN_COOKIE] ?? "";
  if (!token) {
    res.json({ valid: false });
    return;
  }
  const userId = verifySadminToken(token);
  res.json({ valid: !!userId, userId: userId ?? undefined });
});

router.delete("/session", (_req: Request, res: Response) => {
  res.clearCookie(SADMIN_COOKIE, { path: "/" });
  res.json({ ok: true });
});

router.get("/verify", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token || !SB_SRV) {
    res.status(401).json({ authorized: false, message: "Non authentifié" });
    return;
  }

  try {
    const userRes = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { apikey: SB_SRV, Authorization: `Bearer ${token}` },
    });
    if (!userRes.ok) {
      res.status(401).json({ authorized: false, message: "Token invalide" });
      return;
    }
    const user = await userRes.json();
    const role = user?.user_metadata?.role ?? user?.role ?? "";
    const isAdmin =
      role === "super_super_admin" || role === "super_admin" || role === "admin";
    if (!isAdmin) {
      res.status(403).json({ authorized: false, message: "Permission insuffisante" });
      return;
    }
    res.json({
      authorized: true,
      user: { id: user.id, email: user.email, role },
    });
  } catch (e) {
    res.status(500).json({ authorized: false, message: String(e) });
  }
});

export default router;
