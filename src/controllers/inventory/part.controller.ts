import { Request, Response } from 'express';
import { db } from '../../config/database.js';
import type { PartRow } from '../../interfaces/inventory/parts/PartRow.js';
import { validatePart } from '../../validations/inventory/PartValidationHelper/ValidationHelper.js';
import { CreateUpdatePartDTO } from '../../interfaces/inventory/parts/part.interface.js';

export const createPart = async (req: Request, res: Response): Promise<void> => {
    const created_by = (req as any).user?.id;
    
    try{
        const { name, part_number, is_active } = req.body;

        const dto: CreateUpdatePartDTO = {
            name: req.body.name,
            part_number: req.body.part_number,
            is_active: req.body.is_active
        };

        const validation = await validatePart(db, dto, false);

        if (!validation.isValid) {
            res.status(validation.statusCode ?? 400).json({
                success: false,
                errors: validation.errors,
                error_code: "1"
            });

            return;
        }

        const queryText = `
            WITH cte_insert AS (
                INSERT INTO inv.tbl_part (name, part_number, is_active, created_by, created_at)
                VALUES ($1, $2, $3, $4, NOW())
                RETURNING *
            ),
            cte_log AS (
                INSERT INTO inv.tbl_part_log SELECT * FROM cte_insert
            )
            SELECT * FROM cte_insert;
        `;

        const result = await db.query<PartRow>(queryText, [name, part_number, is_active, created_by]);

        res.status(201).json({ success: true, data: result.rows[0], error_code: "0", message: "Part created successfully" });
    }catch(err){
        console.error(err)
        res.status(400).json({ success: false, message: "Could not create part.", error_code: "1" });
    }
};

export const getPartById = async (req: Request, res: Response): Promise<void> => {
    try{
        const { id } = req.params;
        const queryText = 'SELECT * FROM inv.tbl_part WHERE id = $1';
    
        const result = await db.query<PartRow>(queryText, [Number(id)]);
    
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, message: 'Part not found' });
            return;
        }
        
        res.status(200).json({ success: true, data: result.rows[0], error_code: "0" });
    }catch (error){
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Database Error', error_code: "1" });
  }
};

export const updatePart = async (req: Request, res: Response): Promise<void> => {
    const updated_by = (req as any).user?.id;

    try{
        const { id } = req.params;
        
        const { name, part_number, is_active } = req.body;

        const dto: CreateUpdatePartDTO = {
            id: Number(req.params.id),
            name: req.body.name,
            part_number: req.body.part_number,
            is_active: req.body.is_active
        };

        const validation = await validatePart(db, dto, true);

        if (!validation.isValid) {
            res.status(validation.statusCode ?? 400).json({
                success: false,
                errors: validation.errors,
                error_code: "1"
            });

            return;
        }

        const queryText = 'UPDATE inv.tbl_part SET uid = uuid_generate_v4(), name = $1, part_number = $2, is_active = $3, updated_by = $4, updated_at = NOW() WHERE id = $5 RETURNING *';

        const result = await db.query<PartRow>(queryText, [name, part_number, is_active, updated_by, Number(id)]);
    
        if (result.rows.length === 0){
            res.status(404).json({ success: false, message: 'User not found to update', error_code: "1" });
            
            return;
        }
        
        res.status(200).json({ success: true, data: result.rows[0], error_code: "0", message: "Part updated successfully" });
    }catch (error){
        console.error(error);
        res.status(400).json({ success: false, message: 'Update script failed', error_code: "1" });
    }
};

export const listPart = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        let tenantFilter = "";
        const queryParams: any[] = [];
        
        if (user.user_type !== 'admin') {
            tenantFilter = " AND service_center_id = $1 ";
            queryParams.push(user.id);
        } else if (req.query.service_center_id) {
            tenantFilter = " AND service_center_id = $1 ";
            queryParams.push(Number(req.query.service_center_id));
        }

        const query = `
            SELECT
                id,
                name,
                part_number,
                is_active,
                created_by,
                created_at,
                updated_by,
                updated_at
            FROM inv.tbl_part
            WHERE is_deleted = FALSE ${tenantFilter}
            ORDER BY created_at DESC;
        `;

        const result = await db.query(query, queryParams);

        res.status(200).json({
            success: true,
            data: {
                items: result.rows,
                total: result.rowCount
            },
            error_code: "0"
        });
    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            message: "Error while fetching data.",
            error_code: "1"
        });
    }
};

export const uploadPartImage = async (req: Request, res: Response): Promise<void> => {
    const file = (req as any).file;
    if (!file) {
        res.status(400).json({ success: false, message: "No image provided.", error_code: "1" });
        return;
    }
    res.status(201).json({ success: true, data: { url: `/uploads/parts/${file.filename}` }, error_code: "0" });
};

export const deletePart = async (req: Request, res: Response): Promise<void> => {
    const deleted_by = (req as any).user?.id;
    try {
        const { id } = req.params;
        const result = await db.query(
            `UPDATE inv.tbl_part SET is_deleted = TRUE, is_active = FALSE, updated_by = $2, updated_at = NOW() WHERE id = $1 AND is_deleted = FALSE RETURNING id`,
            [Number(id), deleted_by]
        );
        if (result.rowCount === 0) {
            res.status(404).json({ success: false, message: "Part not found.", error_code: "1" });
            return;
        }
        res.status(200).json({ success: true, message: "Part deleted successfully.", error_code: "0" });
    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, message: "Could not delete part.", error_code: "1" });
    }
};