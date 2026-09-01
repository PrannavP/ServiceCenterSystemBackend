import { Router } from 'express';
import authenticationMiddleware from "../../middlewares/authMiddleware.js";
import { getUserBasedMenu } from '../../controllers/app/menu.controller.js';

const router = Router();

router.get("/getmenu/:id", authenticationMiddleware, getUserBasedMenu);

export { router as menuRoutes };