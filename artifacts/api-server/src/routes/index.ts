import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import deviceRouter from "./device/index.js";
import adminRouter from "./admin/index.js";
import syncReadRouter from "./syncRead.js";
import syncWriteRouter from "./syncWrite.js";
import extAuthRouter from "./ext/auth.js";
import extNotificationsRouter from "./ext/notifications.js";
import portalTrackingRouter from "./portal/tracking.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/device", deviceRouter);
router.use("/admin-session", adminRouter);
router.use("/admin", adminRouter);
router.use("/sync-read", syncReadRouter);
router.use("/sync-write", syncWriteRouter);
router.use("/ext/auth", extAuthRouter);
router.use("/ext/notifications", extNotificationsRouter);
router.use("/portal/tracking", portalTrackingRouter);

export default router;
