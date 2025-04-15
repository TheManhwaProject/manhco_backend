import { Router } from "express";
import passport from "passport";
import {
  getNSFWPolicy,
  addRestrictedCountry,
  removeRestrictedCountry,
} from "@controllers/contentFilterController";
import {
  authenticate,
  requireExactRoles,
} from "@root/middleware/authMiddleware";

// Admin route for managing content filter

const router = Router();

router.get(
  "/nsfwPolicy",
  authenticate,
  requireExactRoles(["admin"]),
  getNSFWPolicy
);
router.post(
  "/restrictedCountries",
  authenticate,
  requireExactRoles(["admin"]),
  addRestrictedCountry
);
router.delete(
  "/restrictedCountries",
  authenticate,
  requireExactRoles(["admin"]),
  removeRestrictedCountry
);

export default router;
