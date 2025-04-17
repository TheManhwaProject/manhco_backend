import { Router } from "express";
import {
  profileSetupHandler,
  getUserProfile,
} from "@controllers/profileController";

const router = Router();

router.post("/profile-setup", profileSetupHandler);
router.get("/profile", getUserProfile);

export default router;