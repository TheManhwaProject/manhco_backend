import { Router } from "express";
import {
  getUserNSFWStatus,
  toggleUserNSFWStatus,
} from "@controllers/contentFilterController";

const router = Router();

router.get("/nsfw-status", getUserNSFWStatus);
router.post("/nsfw-status", toggleUserNSFWStatus);

export default router;
