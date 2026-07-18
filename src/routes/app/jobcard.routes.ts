import { Router } from "express";
import {
    createJobCard,
    updateJobCard,
    getJobcardById
} from "../../controllers/app/jobcard.controller.js";

import authenticationMiddleware from "../../middlewares/authMiddleware.js";

const router = Router();

// Authentication middleware for all job card routes
router.use(authenticationMiddleware);

/**
 * @swagger
 * /api/jobcard/create:
 *   post:
 *     security:
 *       - bearerAuth: []
 *
 *     tags:
 *       - APP - Job Card
 *
 *     summary: Create service center job card
 *
 *     description: Creates a new job card for vehicle service and repair tracking.
 *
 *     requestBody:
 *       required: true
 *
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *
 *             required:
 *               - customer_id
 *               - vehicle_id
 *
 *             properties:
 *
 *               customer_id:
 *                 type: integer
 *                 example: 100
 *
 *               vehicle_id:
 *                 type: integer
 *                 example: 25
 *
 *               complaint:
 *                 type: string
 *                 example: "Engine making unusual noise"
 *
 *               remarks:
 *                 type: string
 *                 example: "Customer requested full inspection"
 *
 *               priority:
 *                 type: string
 *                 example: "HIGH"
 *
 *               is_active:
 *                 type: boolean
 *                 example: true
 *
 *
 *     responses:
 *       201:
 *         description: Job card created successfully
 *
 *       400:
 *         description: Validation error
 *
 */
router.post("/create", createJobCard);

/**
 * @swagger
 * /api/jobcard/update/{id}:
 *   post:
 *     security:
 *       - bearerAuth: []
 *
 *     tags:
 *       - APP - Job Card
 *
 *     summary: Update job card
 *
 *     description: Updates existing service center job card information.
 *
 *     parameters:
 *
 *       - in: path
 *         name: id
 *         required: true
 *
 *         schema:
 *           type: integer
 *
 *         example: 1
 *
 *
 *     requestBody:
 *       required: true
 *
 *       content:
 *         application/json:
 *
 *           schema:
 *             type: object
 *
 *             properties:
 *
 *               complaint:
 *                 type: string
 *                 example: "Updated customer complaint"
 *
 *               remarks:
 *                 type: string
 *                 example: "Additional inspection required"
 *
 *               status:
 *                 type: string
 *                 example: "IN_PROGRESS"
 *
 *               is_active:
 *                 type: boolean
 *                 example: true
 *
 *
 *     responses:
 *
 *       200:
 *         description: Job card updated successfully
 *
 *       404:
 *         description: Job card not found
 *
 */
router.post("/update/:id", updateJobCard);

/**
 * @swagger
 * /api/jobcard/get/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *
 *     tags:
 *       - APP - Job Card
 *
 *     summary: Get job card by ID
 *
 *     description: Retrieves a single job card by its identifier.
 *
 *     parameters:
 *
 *       - in: path
 *         name: id
 *         required: true
 *
 *         schema:
 *           type: integer
 *
 *         example: 1
 *
 *
 *     responses:
 *
 *       200:
 *         description: Job card retrieved successfully
 *
 *       404:
 *         description: Job card not found
 *
 */
router.get("/get/:id", getJobcardById);

export { router as jobcardRoutes };