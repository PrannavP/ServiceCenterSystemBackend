import { Router } from 'express';
import authenticationMiddleware from "../../middlewares/authMiddleware.js";
import { registerUser, loginUser, getCurrentUser } from '../../controllers/app/user.controller.js';

const router = Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/me", authenticationMiddleware, getCurrentUser);

export { router as userRoutes };