import { Router } from "express";
import {
  profileSetupHandler,
  getUserProfile,
  editUserProfile,
} from "@controllers/profileController";

const router = Router();

router.post("/profile-setup", profileSetupHandler);
router.get("/profile", getUserProfile);
router.put("/profile", editUserProfile);

export default router;