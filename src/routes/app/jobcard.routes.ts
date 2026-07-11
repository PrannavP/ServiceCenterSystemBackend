import { Router } from 'express';
import { createJobCard, updateJobCard, getJobcardById } from '../../controllers/app/jobcard.controller.js';

const router = Router();

// GET /api/jobcard/create
router.post("/create", createJobCard);
router.post("/update/:id", updateJobCard);
router.get("/get/:id", getJobcardById);

export { router as jobcardRoutes };