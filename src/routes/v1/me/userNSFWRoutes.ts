import { Router } from "express";
import {
  getUserNSFWStatus,
  toggleUserNSFWStatus,
} from "@controllers/contentFilterController";
import { authenticate } from "@middleware/authMiddleware";

const router = Router();

router.get("/nsfw-status", authenticate, getUserNSFWStatus);
router.post("/nsfw-status", authenticate, toggleUserNSFWStatus);

export default router;
