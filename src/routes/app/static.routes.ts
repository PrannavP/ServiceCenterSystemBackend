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

/**
 * @swagger
 * tags:
 *   - name: Static
 *     description: Lookup data (vehicle types / models) with inline create
 */

/**
 * @swagger
 * /api/static/vehicle-types:
 *   get:
 *     tags: [Static]
 *     summary: List vehicle types
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Static]
 *     summary: Add a vehicle type
 *     responses: { 201: { description: Created } }
 */
router.get("/vehicle-types", listVehicleTypes);
router.post("/vehicle-types", createVehicleType);

/**
 * @swagger
 * /api/static/vehicles:
 *   get:
 *     tags: [Static]
 *     summary: List vehicles (optionally by vehicle_type_id)
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Static]
 *     summary: Add a vehicle
 *     responses: { 201: { description: Created } }
 */
router.get("/vehicles", listVehicles);
router.post("/vehicles", createVehicle);

export { router as staticRoutes };
