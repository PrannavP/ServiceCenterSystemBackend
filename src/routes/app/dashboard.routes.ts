import { Router } from "express";
import authenticationMiddleware from "../../middlewares/authMiddleware.js";
import { getDashboardSummary } from "../../controllers/app/dashboard.controller.js";

const router = Router();

router.use(authenticationMiddleware);

/**
 * @swagger
 * /api/dashboard/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Live dashboard aggregates and time-series
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Summary data
 */
router.get("/summary", getDashboardSummary);

export { router as dashboardRoutes };
