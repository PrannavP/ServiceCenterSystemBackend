import { Router } from "express";
import {
    createReceipt,
    getReceiptById,
    loadddl,
    receiptList,
    updateReceipt
} from "../../controllers/inventory/receipt.controller.js";

import authenticationMiddleware from "../../middlewares/authMiddleware.js";


const router = Router();


// Protect all receipt endpoints
router.use(authenticationMiddleware);

/**
 * @swagger
 * /api/receipt/create:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Inventory - Receipt
 *     summary: Create inventory receipt
 *     description: Receives items into the service center inventory.
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplier_id
 *               - items
 *
 *             properties:
 *               supplier_id:
 *                 type: integer
 *                 example: 1
 *
 *               receipt_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-01-18"
 *
 *               remarks:
 *                 type: string
 *                 example: "Monthly spare parts delivery"
 *
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     part_id:
 *                       type: integer
 *                       example: 10
 *
 *                     quantity:
 *                       type: number
 *                       example: 25
 *
 *                     unit_price:
 *                       type: number
 *                       example: 150.50
 *
 *
 *     responses:
 *       201:
 *         description: Receipt created successfully
 *
 *       400:
 *         description: Validation error
 *
 */
router.post("/create", createReceipt);

/**
 * @swagger
 * /api/receipt/get/{receipt_id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *
 *     tags:
 *       - Inventory - Receipt
 *
 *     summary: Get inventory receipt by ID
 *
 *     parameters:
 *       - in: path
 *         name: receipt_id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1001
 *
 *     responses:
 *       200:
 *         description: Receipt found
 *
 *       404:
 *         description: Receipt not found
 *
 */
router.get("/get/:receipt_id", getReceiptById);

/**
 * @swagger
 * /api/receipt/update/{receipt_id}:
 *   post:
 *     security:
 *       - bearerAuth: []
 *
 *     tags:
 *       - Inventory - Receipt
 *
 *     summary: Update inventory receipt
 *
 *     parameters:
 *       - in: path
 *         name: receipt_id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1001
 *
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *
 *             properties:
 *               remarks:
 *                 type: string
 *                 example: "Updated supplier details"
 *
 *               is_active:
 *                 type: boolean
 *                 example: true
 *
 *
 *     responses:
 *       200:
 *         description: Receipt updated successfully
 *
 */
router.post("/update/:receipt_id",updateReceipt);

// get api for receipt list
router.get("/list", receiptList);

router.get("/loadddl", authenticationMiddleware, loadddl);

export { router as receiptRoute };