import { Router } from "express";
import { 
  authenticate, 
  requireRoles,
  optionalAuthenticate 
} from "@middleware/authMiddleware";
import { validateCsrfToken } from "@middleware/csrfMiddleware";
import {
  searchManhwa,
  getManhwaById,
  createManhwa,
  getManhwaBulk,
  refreshManhwa,
  importFromMangadex,
  getGenres,
  getTrending,
  getRecentlyAdded,
  getCacheStatus,
  clearCache
} from "@controllers/manhwaController";
import * as cache from "@utils/cache";

const router = Router();

// Public routes - no auth required
router.post("/search", searchManhwa);
router.get("/genres", getGenres);
router.get("/trending", getTrending);
router.get("/recent", getRecentlyAdded);
router.get("/:id", optionalAuthenticate, getManhwaById); // Optional auth for user-specific features later
router.post("/bulk", getManhwaBulk);

// Admin routes - require authentication and admin role
router.post(
  "/", 
  authenticate, 
  requireRoles(['admin']), 
  validateCsrfToken, 
  createManhwa
);

router.post(
  "/:id/refresh",
  authenticate,
  requireRoles(['admin']),
  validateCsrfToken,
  refreshManhwa
);

router.post(
  "/import",
  authenticate,
  requireRoles(['admin']),
  validateCsrfToken,
  importFromMangadex
);

// Cache management (admin only)
router.get(
  "/cache/status",
  authenticate,
  requireRoles(['admin']),
  getCacheStatus
);

router.post(
  "/cache/clear",
  authenticate,
  requireRoles(['admin']),
  validateCsrfToken,
  clearCache
);

// Health check endpoint
router.get("/health/status", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    cache: cache.getCacheStats()
  });
});

export default router;