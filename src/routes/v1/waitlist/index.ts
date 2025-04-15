import { Router } from 'express';
import { createWaitlistEntry } from '@controllers/waitlistController';

const router = Router();

router.post('/entry', createWaitlistEntry);

export default router;
