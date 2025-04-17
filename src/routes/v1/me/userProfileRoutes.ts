import { Router } from "express";
import { profileSetupHandler } from "@controllers/profileSetupController";

const router = Router();

router.post("/profile-setup", profileSetupHandler);

export default router;