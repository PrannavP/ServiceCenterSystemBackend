import { Router } from 'express';
import { createReceipt, getReceiptById, updateReceipt } from '../../controllers/inventory/receipt.controller.js';

const router = Router();

// GET /api/part/create
router.post('/create', createReceipt);
router.get('/get/:receipt_id', getReceiptById);
router.post('/update/:receipt_id', updateReceipt);

export { router as receiptRoute };