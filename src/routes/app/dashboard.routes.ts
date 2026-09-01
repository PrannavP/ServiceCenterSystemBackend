import { Router } from "express";
import authenticationMiddleware from "../../middlewares/authMiddleware.js";
import { getDashboardSummary } from "../../controllers/app/dashboard.controller.js";

const router = Router();

router.use(authenticationMiddleware);

router.get("/summary", getDashboardSummary);

export { router as dashboardRoutes };
