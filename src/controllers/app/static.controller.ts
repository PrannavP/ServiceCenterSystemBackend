import { Request, Response } from "express";
import { db } from "../../config/database.js";

export const listVehicleTypes = async (_req: Request, res: Response): Promise<void> => {
    try {
        const result = await db.query(
            `SELECT id, name FROM tbl_vehicle_type WHERE is_active = true ORDER BY name`
        );
        res.status(200).json({ success: true, data: result.rows, error_code: "0" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Could not fetch vehicle types.", error_code: "1" });
    }
};

export const createVehicleType = async (req: Request, res: Response): Promise<void> => {
    try {
        const name = (req.body?.name ?? "").toString().trim();
        if (!name) {
            res.status(400).json({ success: false, message: "Name is required.", error_code: "1" });
            return;
        }

        const result = await db.query(
            `INSERT INTO tbl_vehicle_type (name) VALUES ($1) RETURNING id, name`,
            [name]
        );
        res.status(201).json({ success: true, data: result.rows[0], error_code: "0", message: "Vehicle type added." });
    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, message: "Could not add vehicle type.", error_code: "1" });
    }
};

export const listVehicles = async (req: Request, res: Response): Promise<void> => {
    try {
        const typeId = req.query.vehicle_type_id ? Number(req.query.vehicle_type_id) : null;
        const result = typeId
            ? await db.query(
                  `SELECT id, name, vehicle_type_id FROM tbl_vehicle WHERE is_active = true AND vehicle_type_id = $1 ORDER BY name`,
                  [typeId]
              )
            : await db.query(
                  `SELECT id, name, vehicle_type_id FROM tbl_vehicle WHERE is_active = true ORDER BY name`
              );
        res.status(200).json({ success: true, data: result.rows, error_code: "0" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Could not fetch vehicles.", error_code: "1" });
    }
};

export const createVehicle = async (req: Request, res: Response): Promise<void> => {
    try {
        const name = (req.body?.name ?? "").toString().trim();
        const vehicleTypeId = req.body?.vehicle_type_id ? Number(req.body.vehicle_type_id) : null;
        if (!name) {
            res.status(400).json({ success: false, message: "Name is required.", error_code: "1" });
            return;
        }

        const result = await db.query(
            `INSERT INTO tbl_vehicle (name, vehicle_type_id) VALUES ($1, $2) RETURNING id, name, vehicle_type_id`,
            [name, vehicleTypeId]
        );
        res.status(201).json({ success: true, data: result.rows[0], error_code: "0", message: "Vehicle added." });
    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, message: "Could not add vehicle.", error_code: "1" });
    }
};
