import { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { validateReceipt } from '../../validations/inventory/ReceiptValidationHelper/ValidationHelper.js';
import { CreateUpdateReceiptDTO } from '../../interfaces/inventory/receipt/receipt.interface.js';

export const createReceipt = async (req: Request, res: Response): Promise<void> => {
    const created_by = (req as any).user?.id;
    
    try{
        const { remarks, number, is_active, details } = req.body

        const dto: CreateUpdateReceiptDTO = {
            remarks: remarks,
            number: number,
            is_active: is_active,
            detail: details
        };

        const validation = await validateReceipt(db, dto, false);

        if (!validation.isValid) {
            res.status(validation.statusCode ?? 400).json({
                success: false,
                errors: validation.errors,
                error_code: "1"
            });

            return;
        }

        const current_datetime = new Date();

        const insertMasterTableQuery = `
            WITH cte_insert AS (
                INSERT INTO inv.tbl_receipt (
                    transaction_date,
                    remarks,
                    number,
                    is_active,
                    created_by,
                    updated_by
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    true,
                    $4,
                    $4
                )
                RETURNING *
            ),
            cte_log AS (
                INSERT INTO inv.tbl_receipt_log
                SELECT *
                FROM cte_insert
            )
            SELECT *
            FROM cte_insert;
        `;

        const masterResult = await db.query(insertMasterTableQuery, [
            current_datetime, dto.remarks?.trim(), dto.number?.trim(), created_by
        ]);

        const recepit = masterResult.rows[0];
        const receiptId = recepit.id;
        const receiptUid = recepit.uid;

        const insertDetailQuery = `
            WITH cte_insert AS (
                INSERT INTO inv.tbl_receipt_detail (
                    receipt_id,
                    receipt_uid,
                    part_id,
                    quantity,
                    rate,
                    total,
                    created_by,
                    updated_by
                )
                SELECT
                    $1,
                    $2,
                    d.part_id,
                    d.quantity,
                    d.rate,
                    d.total,
                    $4,
                    $4
                FROM jsonb_to_recordset($3::jsonb) AS d(
                    part_id INT,
                    quantity NUMERIC,
                    rate NUMERIC,
                    total NUMERIC
                )
                RETURNING *
            ),
            cte_log AS (
                INSERT INTO inv.tbl_receipt_detail_log
                SELECT *
                FROM cte_insert
            )
            SELECT *
            FROM cte_insert;
        `;

        const detailResult = await db.query(insertDetailQuery, [
            receiptId,
            receiptUid,
            JSON.stringify(dto.detail),
            created_by
        ]);

        const result = {
            master: masterResult.rows[0],
            details: detailResult.rows
        };

        res.status(201).json({ message: "Receipt created successfully", success: true, data: result, error_code: "0" });
    }catch(err){
        console.log(err);
        res.status(400).json({ success: false, message: "Could not create receipt.", error_code: "1" });
    }
}

export const getReceiptById = async (req: Request, res: Response): Promise<void> => {
    try{
        const {receipt_id} = req.params;

        const mainDataQuery = `
            select 
                transaction_date, remarks, number, is_active
            from inv.tbl_receipt where id = $1 and is_deleted = false
        `;

        const detailDataQuery = `
            select 
                part_id,
                quantity,
                rate,
                total
            from inv.tbl_receipt_detail where receipt_id = $1 and is_deleted = false
        `;

        const mainResult = await db.query(mainDataQuery, [Number(receipt_id)]);
        const detailResult = await db.query(detailDataQuery, [Number(receipt_id)]);

        const data = {
            receipt: mainResult.rows[0],      // single object
            details: detailResult.rows        // array
        };

        if(mainResult.rows.length === 0){
            res.status(404).json({ success: false, message: 'Receipt not found' });
            return;
        }

        res.status(200).json({ success: true, data: data, error_code: "0" });
    }catch(err){
        res.status(500).json({ success: false, message: "Error while fetching receipt data.", error_code: "1" });
    }
};

export const updateReceipt = async (req: Request, res: Response): Promise<void> => {
    const updated_by = (req as any).user?.id;
    
    try {
        const receiptId = req.params.receipt_id;

        const { remarks, number, is_active, detail } = req.body;

        const dto: CreateUpdateReceiptDTO = {
            remarks,
            number,
            is_active,
            detail
        };

        const validation = await validateReceipt(db, dto, true);

        if (!validation.isValid) {
            res.status(validation.statusCode ?? 400).json({
                success: false,
                errors: validation.errors,
                error_code: "1"
            });
            return;
        }

        const updateMasterQuery = `
            UPDATE inv.tbl_receipt
            SET
                remarks = $1,
                number = $2,
                is_active = $3,
                updated_at = NOW(),
                updated_by = $5
            WHERE id = $4
            RETURNING *;
        `;

        const masterResult = await db.query(updateMasterQuery, [
            dto.remarks?.trim(),
            dto.number?.trim(),
            dto.is_active,
            Number(receiptId),
            updated_by
        ]);

        if (masterResult.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Receipt not found",
                error_code: "1"
            });
            return;
        }

        const receipt = masterResult.rows[0];

        await db.query(
            `
            UPDATE inv.tbl_receipt_detail
            SET
                is_active = FALSE,
                is_deleted = TRUE,
                updated_at = NOW(),
                updated_by = $2
            WHERE receipt_id = $1
              AND is_active = TRUE;
            `,
            [receipt.id, updated_by]
        );

        const insertDetailQuery = `
            INSERT INTO inv.tbl_receipt_detail (
                receipt_id,
                receipt_uid,
                part_id,
                quantity,
                rate,
                total,
                created_by,
                created_at,
                updated_by,
                updated_at
            )
            SELECT
                $1,
                $2,
                d.part_id,
                d.quantity,
                d.rate,
                d.total,
                $4,
                NOW(),
                $4,
                NOW()
            FROM jsonb_to_recordset($3::jsonb) AS d(
                part_id INT,
                quantity NUMERIC,
                rate NUMERIC,
                total NUMERIC
            )
            RETURNING *;
        `;

        const detailResult = await db.query(insertDetailQuery, [
            receipt.id,
            receipt.uid,
            JSON.stringify(dto.detail),
            updated_by
        ]);

        res.status(200).json({
            message: "Receipt updated successfully",
            success: true,
            data: {
                master: receipt,
                details: detailResult.rows
            },
            error_code: "0"
        });

    } catch (err) {
        console.error(err);

        res.status(400).json({
            success: false,
            message: "Could not update receipt.",
            error_code: "1"
        });
    }
};

export const receiptList = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT
                id,
                transaction_date,
                number as receipt_number,
                is_active,
                created_by,
                created_at,
                updated_by,
                updated_at
            FROM inv.tbl_receipt
            WHERE is_deleted = FALSE
            ORDER BY created_at DESC;
        `;

        const result = await db.query(query);

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

export const loadddl = async (req: Request, res: Response): Promise<void> => {
    try{
        const queryText = 'SELECT id as id, name as label, part_number, total_quantity FROM inv.tbl_part where is_active';
    
        const result = await db.query(queryText);
        
        res.status(200).json({ success: true, data: result.rows || [], error_code: "0" });
    }catch (error){
        console.error(error);
        res.status(500).json({ success: false, message: 'Error fetching LoadDDL data.', error_code: "1" });
  }
};
export const deleteReceipt = async (req: Request, res: Response): Promise<void> => {
    const deleted_by = (req as any).user?.id;
    try {
        const { receipt_id } = req.params;
        const result = await db.query(
            `UPDATE inv.tbl_receipt SET is_deleted = TRUE, is_active = FALSE, updated_by = $2, updated_at = NOW() WHERE id = $1 AND is_deleted = FALSE RETURNING id`,
            [Number(receipt_id), deleted_by]
        );
        if (result.rowCount === 0) {
            res.status(404).json({ success: false, message: "Receipt not found.", error_code: "1" });
            return;
        }
        await db.query(
            `UPDATE inv.tbl_receipt_detail SET is_deleted = TRUE, is_active = FALSE, updated_at = NOW() WHERE receipt_id = $1 AND is_deleted = FALSE`,
            [Number(receipt_id)]
        );
        res.status(200).json({ success: true, message: "Receipt deleted successfully.", error_code: "0" });
    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, message: "Could not delete receipt.", error_code: "1" });
    }
};
