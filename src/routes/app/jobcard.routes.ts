import { Router } from 'express';
import { createJobCard } from '../../controllers/app/jobcard.controller.js';

const router = Router();

// GET /api/jobcard/create
router.post("/create", createJobCard);

export { router as jobcardRoutes };