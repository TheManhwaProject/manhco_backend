import { Router } from "express";
import { checkUsernameHandler } from "@controllers/userController";

const router = Router();

router.get("/check-username", checkUsernameHandler);

export default router;
