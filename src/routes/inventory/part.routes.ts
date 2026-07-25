import { Router } from "express";
import {
    createPart,
    getPartById,
    listPart,
    updatePart
} from "../../controllers/inventory/part.controller.js";
import authenticationMiddleware from "../../middlewares/authMiddleware.js";

const router = Router();

// Authentication for all part routes
router.use(authenticationMiddleware);

/**
 * @swagger
 * /api/part/create:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Inventory - Part
 *     summary: Create part for service center inventory
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - part_number
 *             properties:
 *               name:
 *                 type: string
 *                 example: Brake Pad
 *               part_number:
 *                 type: string
 *                 example: BP-001
 *               is_active:
 *                 type: boolean
 *                 example: true
 *
 *     responses:
 *       201:
 *         description: Part created successfully
 *
 *       400:
 *         description: Validation error
 *
 */
router.post("/create", createPart);

/**
 * @swagger
 * /api/part/get/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Inventory - Part
 *     summary: Get part by ID
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *
 *     responses:
 *       200:
 *         description: Part found
 *
 *       404:
 *         description: Part not found
 *
 */
router.get("/get/:id", getPartById);

/**
 * @swagger
 * /api/part/update/{id}:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Inventory - Part
 *     summary: Update part
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Brake Pad Updated
 *               part_number:
 *                 type: string
 *                 example: BP-002
 *               is_active:
 *                 type: boolean
 *                 example: true
 *
 *     responses:
 *       200:
 *         description: Part updated successfully
 *
 */
router.post("/update/:id",updatePart);

// list page get api
router.get("/list", listPart);

export { router as partRoutes };