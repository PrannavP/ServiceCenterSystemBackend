import { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { validateReceipt } from '../../validations/inventory/ReceiptValidationHelper/ValidationHelper.js';
import { CreateUpdateReceiptDTO } from '../../interfaces/inventory/receipt/receipt.interface.js';

// create
export const createReceipt = async (req: Request, res: Response): Promise<void> => {
    try{
        const { remarks, number, is_active, detail } = req.body

        const dto: CreateUpdateReceiptDTO = {
            remarks: remarks,
            number: number,
            is_active: is_active,
            detail: detail
        };

        const validation = await validateReceipt(db, dto, false);

        // if validation has invalid then throw response error and return
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
                    1,
                    1
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

        // execute queries and store
        const masterResult = await db.query(insertMasterTableQuery, [
            current_datetime, dto.remarks?.trim(), dto.number?.trim()
        ]);

        const recepit = masterResult.rows[0];
        const receiptId = recepit.id;
        const receiptUid = recepit.uid;

        // using json recordset for bulk insertion in receipt details
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
                    1,
                    1
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
            JSON.stringify(dto.detail)
        ]);

        const result = {
            master: masterResult.rows[0],
            details: detailResult.rows
        };

        res.status(201).json({ success: true, data: result, error_code: "0" });
    }catch(err){
        console.log(err);
        res.status(400).json({ success: false, message: "Could not create receipt.", error_code: "1" });
    }
}

// get receipt by id
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

        // combine 2 results in one object and return
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
    try {
        const receiptId = req.query.receipt_id;

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

        // Update master table
        const updateMasterQuery = `
            UPDATE inv.tbl_receipt
            SET
                remarks = $1,
                number = $2,
                is_active = $3,
                updated_at = NOW(),
                updated_by = 1
            WHERE id = $4
            RETURNING *;
        `;

        const masterResult = await db.query(updateMasterQuery, [
            dto.remarks?.trim(),
            dto.number?.trim(),
            dto.is_active,
            Number(receiptId)
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

        // Soft delete existing detail rows
        await db.query(
            `
            UPDATE inv.tbl_receipt_detail
            SET
                is_active = FALSE,
                is_deleted = TRUE,
                updated_at = NOW(),
                updated_by = 1
            WHERE receipt_id = $1
              AND is_active = TRUE;
            `,
            [receipt.id]
        );

        // Insert new detail rows
        const insertDetailQuery = `
            INSERT INTO inv.tbl_receipt_detail (
                receipt_id,
                receipt_uid,
                part_id,
                quantity,
                rate,
                total
            )
            SELECT
                $1,
                $2,
                d.part_id,
                d.quantity,
                d.rate,
                d.total
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
            JSON.stringify(dto.detail)
        ]);

        res.status(200).json({
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

// list page