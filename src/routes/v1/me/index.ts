import { Router } from "express";
import { authenticate } from "@middleware/authMiddleware";
import userNSFWRoutes from "./userNSFWRoutes";

const router = Router();

router.use(authenticate);

router.use("/", userNSFWRoutes);

export default router;
