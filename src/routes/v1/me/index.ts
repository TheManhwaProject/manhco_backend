import { Router } from "express";
import { authenticate, requireOwnership } from "@middleware/authMiddleware";
import userNSFWRoutes from "./userNSFWRoutes";
import userProfileRoutes from "./userProfile";

const router = Router();

router.use(authenticate);

router.use("/", requireOwnership(), userNSFWRoutes);
router.use("/", userProfileRoutes);

export default router;
