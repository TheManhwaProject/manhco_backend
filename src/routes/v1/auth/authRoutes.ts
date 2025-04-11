import { Router } from "express";
import passport from "passport";
import { 
  handleGoogleAuthSuccess, 
  refreshToken, 
  logout,
  getCurrentUser 
} from "@controllers/authController";
import { authenticate } from "../../../middleware/authMiddleware";
import { setCsrfToken } from "../../../middleware/csrfMiddleware";

const router = Router();

// Google OAuth routes
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  handleGoogleAuthSuccess
);

// JWT authentication routes
router.post("/refresh", refreshToken);
router.post("/logout", authenticate, logout);

// Get current user information
router.get("/me", authenticate, getCurrentUser);

// CSRF token generation endpoint
router.get("/csrf-token", setCsrfToken, (req, res) => {
  res.json({ csrfToken: res.locals.csrfToken });
});

export default router;
