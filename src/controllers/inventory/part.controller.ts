import { Request, Response } from 'express';
import { db } from '../../config/database.js';
import type { PartRow } from '../../interfaces/inventory/parts/PartRow.js';
import { validatePart } from '../../validations/inventory/PartValidationHelper/ValidationHelper.js';
import { CreateUpdatePartDTO } from '../../interfaces/inventory/parts/part.interface.js';

// Create
export const createPart = async (req: Request, res: Response): Promise<void> => {
    const created_by = (req as any).user?.id;
    
    try{
        const { name, part_number, is_active } = req.body;

        // format the request body data into proper interface data
        const dto: CreateUpdatePartDTO = {
            name: req.body.name,
            part_number: req.body.part_number,
            is_active: req.body.is_active
        };

        // store the validation returned by the function
        const validation = await validatePart(db, dto, false);

        // if validation has invalid then throw response error and return
        if (!validation.isValid) {
            res.status(validation.statusCode ?? 400).json({
                success: false,
                errors: validation.errors,
                error_code: "1"
            });

            return;
        }

        const queryText = `
            with cte_insert as(
                INSERT INTO inv.tbl_part (name, part_number, is_active, created_by, created_at)
                VALUES
                ($1, $2, $3, $4, NOW())
                RETURNING *
            )
            INSERT INTO inv.tbl_part_log
            SELECT * FROM cte_insert;
        `;

        const result = await db.query<PartRow>(queryText, [name, part_number, is_active, created_by]);

        res.status(201).json({ success: true, data: result.rows[0], error_code: "0" });
    }catch(err){
        res.status(400).json({ success: false, message: "Could not create part.", error_code: "1" });
    }
};

// READ SINGLE: Fetch one row by ID
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
        res.status(500).json({ success: false, message: 'Server Database Error', error_code: "1" });
  }
};

// UPDATE: Modify user columns dynamically
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

        // call the validation helper function for validating
        const validation = await validatePart(db, dto, true);

        // if not valid then response error and return early
        if (!validation.isValid) {
            res.status(validation.statusCode ?? 400).json({
                success: false,
                errors: validation.errors,
                error_code: "1" // 0 means success and 1 means error
            });

            return;
        }
        
        const queryText = 'UPDATE inv.tbl_part SET uid = fn_new_uuid(), name = $1, part_number = $2, is_active = $3, updated_by = $5, updated_date = NOW() WHERE id = $4 RETURNING *';
    
        const result = await db.query<PartRow>(queryText, [name, part_number, is_active, Number(id), updated_by]);
    
        if (result.rows.length === 0){
            res.status(404).json({ success: false, message: 'User not found to update', error_code: "1" });
            
            return;
        }
        
        res.status(200).json({ success: true, data: result.rows[0], error_code: "0" });
    }catch (error){
        res.status(400).json({ success: false, message: 'Update script failed', error_code: "1" });
    }
};

// List page
export const listPart = async (req: Request, res: Response): Promise<void> => {
    try{

    }catch(error){

    }
};