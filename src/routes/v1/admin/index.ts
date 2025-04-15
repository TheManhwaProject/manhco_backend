import { Router } from "express";
import { authenticate, requireExactRoles } from "@middleware/authMiddleware";
import contentFilterRoutes from "./contentFilterRoutes";

const router = Router();

router.use(authenticate, requireExactRoles(["admin"]));

router.use("/content-filter", contentFilterRoutes);

export default router;