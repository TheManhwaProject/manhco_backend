import { Router } from "express";
import { authenticate, requireExactRoles } from "@middleware/authMiddleware";
import contentFilterRoutes from "./contentFilterRoutes";
import { manhwaSyncJob } from "../../../jobs/manhwaSyncJob";
import { AppError, ErrorAppCode } from "../../../utils/errorHandler";
import { validateCsrfToken } from "../../../middleware/csrfMiddleware";
import * as manhwaService from "../../../services/manhwaService";

const router = Router();

router.use(authenticate, requireExactRoles(["admin"]));

router.use("/content-filter", contentFilterRoutes);

// Manhwa sync management routes
// Get sync job status
router.get('/manhwa/sync/status', (req, res) => {
  res.json(manhwaSyncJob.getStatus());
});

// Trigger sync for specific manhwa
router.post('/manhwa/sync/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError('Invalid ID', 400, ErrorAppCode.BadInput);
    }
    
    const manhwa = await manhwaService.getManhwaById(id);
    if (!manhwa.mangadexId) {
      throw new AppError('Not a Mangadex manga', 400, ErrorAppCode.BadInput);
    }
    
    await manhwaSyncJob.syncNow(id, manhwa.mangadexId);
    res.json({ message: 'Sync queued with high priority' });
  } catch (error) {
    next(error);
  }
});

// Trigger full sync
router.post('/manhwa/sync/all', validateCsrfToken, async (req, res) => {
  await manhwaSyncJob.queueOutdatedManhwa();
  manhwaSyncJob.processQueue();
  res.json({ message: 'Full sync initiated' });
});

export default router;