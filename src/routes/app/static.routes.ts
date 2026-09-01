import { Router } from "express";
import authenticationMiddleware from "../../middlewares/authMiddleware.js";
import {
    listVehicleTypes,
    createVehicleType,
    listVehicles,
    createVehicle,
} from "../../controllers/app/static.controller.js";

const router = Router();

router.use(authenticationMiddleware);

router.get("/vehicle-types", listVehicleTypes);
router.post("/vehicle-types", createVehicleType);

router.get("/vehicles", listVehicles);
router.post("/vehicles", createVehicle);

export { router as staticRoutes };
