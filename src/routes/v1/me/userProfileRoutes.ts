import { Router } from "express";
import {
  profileSetupHandler,
  getUserProfile,
  editUserProfile,
} from "@controllers/profileController";
import {
  uploadProfilePicture,
  uploadProfilePictureMiddleware,
} from "@controllers/pfpUpload";
import { profileUploadRateLimiter } from "@middleware/ratelimiters";

const router = Router();

router.post("/profile-setup", profileSetupHandler);
router.get("/profile", getUserProfile);
router.put("/profile", editUserProfile);
router.post(
  "/profile-picture",
  profileUploadRateLimiter,
  uploadProfilePictureMiddleware,
  uploadProfilePicture
);

export default router;
