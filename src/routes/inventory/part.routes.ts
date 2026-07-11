import { Router } from 'express';
import { createPart, getPartById, updatePart } from '../../controllers/inventory/part.controller.js';

const router = Router();

// GET /api/part/create
router.post('/create', createPart);
router.get('/get/:id', getPartById);
router.post('/update/:id', updatePart);

export { router as partRoutes };