import { Router } from "express";
import {
  getUserNSFWStatus,
  toggleUserNSFWStatus,
} from "@controllers/contentFilterController";
import { authenticate } from "@middleware/authMiddleware";

const router = Router();

router.get("/nsfwStatus", authenticate, getUserNSFWStatus);
router.post("/nsfwStatus", authenticate, toggleUserNSFWStatus);

export default router;
