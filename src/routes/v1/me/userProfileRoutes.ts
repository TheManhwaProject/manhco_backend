import { Router } from "express";
import {
  profileSetupHandler,
  getUserProfile,
  editUserProfile,
} from "@controllers/profileController";
import { ProfilePictureProcessor } from "@root/services/ProfilePictureProcessor";

const router = Router();

router.post("/profile-setup", profileSetupHandler);
router.get("/profile", getUserProfile);
router.put("/profile", editUserProfile);

export default router;