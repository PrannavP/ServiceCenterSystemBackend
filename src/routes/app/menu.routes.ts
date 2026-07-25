import { Router } from 'express';
import authenticationMiddleware from "../../middlewares/authMiddleware.js";
import { getUserBasedMenu } from '../../controllers/app/menu.controller.js';

const router = Router();

/**
 * @swagger
 * /getmenu/{id}:
 *   get:
 *     summary: Get menus based on user type
 *     description: Returns available menus according to the user's role (admin, front_office, etc.)
 *     tags:
 *       - Menu
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: User ID
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Menu fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: Dashboard
 *                       path:
 *                         type: string
 *                         example: /dashboard
 *                       icon:
 *                         type: string
 *                         example: dashboard
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: User not found.
 *       400:
 *         description: Failed to fetch menu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Could not fetch menu.
 *                 error_code:
 *                   type: string
 *                   example: "1"
 */
router.get("/getmenu/:id", authenticationMiddleware, getUserBasedMenu);

export { router as menuRoutes };