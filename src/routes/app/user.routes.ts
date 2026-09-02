import { Router } from 'express';
import authenticationMiddleware from "../../middlewares/authMiddleware.js";
import { registerUser, loginUser, getCurrentUser, requestPasswordReset, resetPassword, createServiceCenter, getUsers, resetPasswordForced, updateServiceCenter } from '../../controllers/app/user.controller.js';

const router = Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/current-user", authenticationMiddleware, getCurrentUser);

router.post("/forgot-password", requestPasswordReset);

router.post("/reset-password", resetPassword);
router.post("/reset-password-forced", authenticationMiddleware, resetPasswordForced);

router.post("/create-service-center", authenticationMiddleware, createServiceCenter);
router.put("/update-service-center/:id", authenticationMiddleware, updateServiceCenter);
router.get("/list", authenticationMiddleware, getUsers);

export { router as userRoutes };