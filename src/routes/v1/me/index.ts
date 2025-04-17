import { Router } from "express";
import { authenticate, requireOwnership } from "@middleware/authMiddleware";
import userNSFWRoutes from "./userNSFWRoutes";
import userProfileRoutes from "./userProfileRoutes";

const router = Router();

router.use(authenticate, requireOwnership());

router.use("/", userNSFWRoutes);
router.use("/", userProfileRoutes);

export default router;
