import { Router } from "express";
import waitlistRoutes from "./waitlist/index";
import authRoutes from "./auth/index";
import userRoutes from "./user/index";
import adminRoutes from "./admin/index";
import meRoutes from "./me/index";
import manhwaRoutes from "./manhwa/index";

const router = Router();

router.use("/waitlist", waitlistRoutes);
router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/admin", adminRoutes);
router.use("/me", meRoutes);
router.use("/manhwa", manhwaRoutes);

export default router;
