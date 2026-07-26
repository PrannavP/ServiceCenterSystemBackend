import { Router } from 'express';
import authenticationMiddleware from "../../middlewares/authMiddleware.js";
import { registerUser, loginUser, getCurrentUser } from '../../controllers/app/user.controller.js';

const router = Router();

/**
 * @swagger
 * /api/user/register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: john123
 *               email:
 *                 type: string
 *                 example: john@test.com
 *               password:
 *                 type: string
 *                 example: password123
 *               full_name:
 *                 type: string
 *                 example: John Doe
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *
 *     responses:
 *       201:
 *         description: User created successfully
 *
 */
router.post("/register", registerUser);

/**
 * @swagger
 * /api/user/login:
 *   post:
 *     summary: Login user
 *     tags:
 *       - Authentication
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 example: password123
 *
 *     responses:
 *       200:
 *         description: Login successful
 *
 */
router.post("/login", loginUser);

/**
 * @swagger
 * /api/user/me:
 *   get:
 *     summary: Get the currently authenticated user's profile
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Not authenticated
 */
router.get("/me", authenticationMiddleware, getCurrentUser);

export { router as userRoutes };