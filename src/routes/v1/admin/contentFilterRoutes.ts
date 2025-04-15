// routes/admin/contentFilterRoutes.ts
import { Router } from "express";
import {
  getNSFWPolicy,
  addRestrictedCountry,
  removeRestrictedCountry,
} from "@controllers/contentFilterController";

const router = Router();

router.get("/nsfw-policy", getNSFWPolicy);
router.post("/restricted-countries", addRestrictedCountry);
router.delete("/restricted-countries/:countryCode", removeRestrictedCountry);

export default router;
