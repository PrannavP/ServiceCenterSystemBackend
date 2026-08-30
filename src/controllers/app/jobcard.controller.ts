import { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { validateJobCard } from '../../validations/app/JobCardValidationHelper/ValidationHelper.js';
import { CreateUpdateJobCardDTO, JobCardSettlementDTO } from '../../interfaces/app/job/jobcard.interface.js';

export const createJobCard = async (req: Request, res: Response): Promise<void> => {
    let created_by = 0;

    if(req.body.fromApp === true){
        created_by = req.body.created_by;
    }

    try {
        const {
            customer_name,
            customer_address,
            contact_number,
            static_vehicle_type_id,
            static_vehicle_id,
            vehicle_registration_number,
            odometer_reading,
            fuel_quantity,
            chasis_number,
            problems,
            remarks,
            details
        } = req.body;

        // ── Stock validation ──────────────────────────────────────────────
        // For create, the view already reflects the full "used" quantity
        // across all active job cards, so we can query it directly.
        if (details && details.length > 0) {
            const partIds = details.map((d: any) => d.part_id);

            const stockResult = await db.query<{ part_id: number; part_name: string; available_qty: number }>(
                `SELECT part_id, part_name, available_qty
                 FROM inv.vw_part_current_stock
                 WHERE part_id = ANY($1::int[])`,
                [partIds]
            );

            const stockMap = new Map(
                stockResult.rows.map((r) => [r.part_id, r])
            );

            const stockErrors: string[] = [];

            for (const detail of details) {
                const stock = stockMap.get(detail.part_id);

                if (!stock) {
                    stockErrors.push(`Part ID ${detail.part_id} not found.`);
                    continue;
                }

                if (detail.quantity > stock.available_qty) {
                    stockErrors.push(
                        `"${stock.part_name}" has only ${stock.available_qty} unit(s) available, ` +
                        `but ${detail.quantity} was requested.`
                    );
                }
            }

            if (stockErrors.length > 0) {
                res.status(400).json({
                    success: false,
                    errors: stockErrors,
                    error_code: "1",
                    message: "Insufficient stock for one or more parts."
                });
                return;
            }
        }
        // ─────────────────────────────────────────────────────────────────

        const masterQuery = `
            WITH cte_insert AS (
                INSERT INTO app.tbl_jobcard (
                    customer_name,
                    customer_address,
                    contact_number,
                    static_vehicle_type_id,
                    static_vehicle_id,
                    vehicle_registration_number,
                    odometer_reading,
                    fuel_quantity,
                    chasis_number,
                    problems,
                    remarks,
                    created_by
                )
                VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
                )
                RETURNING *
            ),
            cte_log AS (
                INSERT INTO app.tbl_jobcard_log
                SELECT * FROM cte_insert
            )
            SELECT * FROM cte_insert;
        `;

        const masterResult = await db.query(masterQuery, [
            customer_name,
            customer_address,
            contact_number,
            static_vehicle_type_id,
            static_vehicle_id,
            vehicle_registration_number,
            odometer_reading,
            fuel_quantity,
            chasis_number,
            JSON.stringify(problems),
            remarks,
            created_by
        ]);

        const jobCard = masterResult.rows[0];

        if (details != null && details.length > 0) {

            const detailQuery = `
                WITH cte_insert AS (
                    INSERT INTO app.tbl_jobcard_detail (
                        jobcard_id,
                        jobcard_uid,
                        part_id,
                        quantity,
                        rate,
                        total,
                        created_by
                    )
                    SELECT
                        $1,
                        $2,
                        d.part_id,
                        d.quantity,
                        d.rate,
                        d.total,
                        $4
                    FROM json_to_recordset($3::json) AS d(
                        part_id INT,
                        quantity INT,
                        rate NUMERIC(10,2),
                        total NUMERIC(10,2)
                    )
                    RETURNING *
                )

                INSERT INTO app.tbl_jobcard_detail_log
                SELECT * FROM cte_insert;
            `;

            await db.query(detailQuery, [
                jobCard.id,
                jobCard.uid,
                JSON.stringify(details),
                created_by
            ]);
        }

        res.status(201).json({
            success: true,
            data: jobCard,
            error_code: "0",
            message: "Created job card successfully"
        });

    } catch (err) {
        console.error(err);

        res.status(400).json({
            success: false,
            message: "Could not create job card.",
            error_code: "1"
        });
    }
};

export const updateJobCard = async (req: Request, res: Response): Promise<void> => {
    const updated_by = (req as any).user?.id;

    try {
        const { id } = req.params;

        const {
            customer_name,
            customer_address,
            contact_number,
            static_vehicle_type_id,
            static_vehicle_id,
            vehicle_registration_number,
            odometer_reading,
            fuel_quantity,
            chasis_number,
            problems,
            remarks,
            details
        } = req.body;

        const dto: CreateUpdateJobCardDTO = {
            customer_name,
            customer_address,
            contact_number,
            static_vehicle_type_id,
            static_vehicle_id,
            vehicle_registration_number,
            odometer_reading,
            fuel_quantity,
            chasis_number,
            problems: JSON.stringify(problems),
            remarks,
            is_active: true,
            job_card_detail: details
        };

        const validation = await validateJobCard(db, dto, true);

        if (!validation.isValid) {
            res.status(validation.statusCode ?? 400).json({
                success: false,
                errors: validation.errors,
                error_code: "1"
            });
            return;
        }

        // ── Stock validation ──────────────────────────────────────────────
        // The view counts ALL active job card detail rows as "used".
        // Since we soft-delete the existing rows for this job card and
        // re-insert, we must add back the quantities already committed by
        // THIS job card before comparing against the requested quantities.
        if (details && details.length > 0) {
            const partIds = details.map((d: any) => d.part_id);

            // Current stock from the view (includes this job card's committed qty)
            const stockResult = await db.query<{ part_id: number; part_name: string; available_qty: number }>(
                `SELECT part_id, part_name, available_qty
                 FROM inv.vw_part_current_stock
                 WHERE part_id = ANY($1::int[])`,
                [partIds]
            );

            // Quantities currently committed by THIS job card (about to be freed)
            const committedResult = await db.query<{ part_id: number; committed_qty: number }>(
                `SELECT part_id, SUM(quantity) AS committed_qty
                 FROM app.tbl_jobcard_detail
                 WHERE jobcard_id = $1
                   AND is_active = TRUE
                 GROUP BY part_id`,
                [id]
            );

            const stockMap = new Map(
                stockResult.rows.map((r) => [r.part_id, r])
            );

            // Map of qty that will be freed when existing rows are soft-deleted
            const committedMap = new Map(
                committedResult.rows.map((r) => [r.part_id, Number(r.committed_qty)])
            );

            const stockErrors: string[] = [];

            for (const detail of details) {
                const stock = stockMap.get(detail.part_id);

                if (!stock) {
                    stockErrors.push(`Part ID ${detail.part_id} not found.`);
                    continue;
                }

                // Effective available = view qty + what this job card currently holds
                // (because those rows are about to be soft-deleted before re-insert)
                const freedQty = committedMap.get(detail.part_id) ?? 0;
                const effectiveAvailable = stock.available_qty + freedQty;

                if (detail.quantity > effectiveAvailable) {
                    stockErrors.push(
                        `"${stock.part_name}" has only ${effectiveAvailable} unit(s) available, ` +
                        `but ${detail.quantity} was requested.`
                    );
                }
            }

            if (stockErrors.length > 0) {
                res.status(400).json({
                    success: false,
                    errors: stockErrors,
                    error_code: "1",
                    message: "Insufficient stock for one or more parts."
                });
                return;
            }
        }
        // ─────────────────────────────────────────────────────────────────

        const masterQuery = `
            WITH cte_update AS (
                UPDATE app.tbl_jobcard
                SET
                    customer_name = $2,
                    customer_address = $3,
                    contact_number = $4,
                    static_vehicle_type_id = $5,
                    static_vehicle_id = $6,
                    vehicle_registration_number = $7,
                    odometer_reading = $8,
                    fuel_quantity = $9,
                    chasis_number = $10,
                    problems = $11,
                    remarks = $12,
                    updated_at = NOW(),
                    updated_by = $13
                WHERE id = $1
                RETURNING *
            ),
            cte_log AS (
                INSERT INTO app.tbl_jobcard_log
                SELECT * FROM cte_update
            )
            SELECT * FROM cte_update;
        `;

        const masterResult = await db.query(masterQuery, [
            id,
            customer_name,
            customer_address,
            contact_number,
            static_vehicle_type_id,
            static_vehicle_id,
            vehicle_registration_number,
            odometer_reading,
            fuel_quantity,
            chasis_number,
            JSON.stringify(problems),
            remarks,
            updated_by
        ]);

        if (masterResult.rowCount === 0) {
            res.status(404).json({
                success: false,
                message: "Job card not found.",
                error_code: "1"
            });
            return;
        }

        const jobCard = masterResult.rows[0];

        if (details && details.length > 0) {
            // Soft-delete existing detail rows for this job card
            await db.query(
                `UPDATE app.tbl_jobcard_detail
                 SET
                     is_active  = FALSE,
                     is_deleted = TRUE,
                     updated_at = NOW(),
                     updated_by = $2
                 WHERE jobcard_id = $1
                   AND is_active = TRUE`,
                [jobCard.id, updated_by]
            );

            // Insert the new detail rows (and log them)
            const detailQuery = `
                WITH cte_insert AS (
                    INSERT INTO app.tbl_jobcard_detail (
                        jobcard_id,
                        jobcard_uid,
                        part_id,
                        quantity,
                        rate,
                        total,
                        created_by
                    )
                    SELECT
                        $1,
                        $2,
                        d.part_id,
                        d.quantity,
                        d.rate,
                        d.total,
                        $4
                    FROM json_to_recordset($3::json) AS d(
                        part_id INT,
                        quantity INT,
                        rate NUMERIC(10,2),
                        total NUMERIC(10,2)
                    )
                    RETURNING *
                ),
                cte_log AS (
                    INSERT INTO app.tbl_jobcard_detail_log
                    SELECT * FROM cte_insert
                )
                SELECT * FROM cte_insert;
            `;

            await db.query(detailQuery, [
                jobCard.id,
                jobCard.uid,
                JSON.stringify(details),
                updated_by
            ]);
        }

        res.status(200).json({
            success: true,
            data: jobCard,
            error_code: "0",
            message: "Updated job card successfully"
        });

    } catch (err) {
        console.error(err);

        res.status(400).json({
            success: false,
            message: "Could not update job card.",
            error_code: "1"
        });
    }
};

export const getJobcardById = async (req: Request, res: Response): Promise<void> => {
    try{
        const {id} = req.params;

        const mainDataQuery = `
            select id as jobcard_id,
                customer_name, customer_address, contact_number, static_vehicle_id, static_vehicle_type_id, vehicle_registration_number, odometer_reading,
                fuel_quantity, chasis_number, problems, remarks, is_active, is_settled
            from app.tbl_jobcard where id = $1 and is_deleted = false
        `;

        const detailDataQuery = `
            select
                part_id,
                quantity,
                rate,
                total,
                remarks
            from app.tbl_jobcard_detail where jobcard_id = $1 and is_deleted = false
        `;

        const mainResult = await db.query(mainDataQuery, [Number(id)]);
        const detailResult = await db.query(detailDataQuery, [Number(id)]);

        const data = {
            jobcard: mainResult.rows[0],      // single object
            details: detailResult.rows        // array
        };

        if(mainResult.rows.length === 0){
            res.status(404).json({ success: false, message: 'Job card not found' });
            return;
        }

        res.status(200).json({ success: true, data: data, error_code: "0" });
    }catch(err){
        console.log(err)
        res.status(500).json({ success: false, message: "Error while fetching job card data.", error_code: "1" });
    }
};

export const jobCardList = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT
                id AS jobcard_number,
                customer_name,
                customer_address,
                contact_number,
                static_vehicle_type_id,
                static_vehicle_id,
                vehicle_registration_number,
                is_active,
                is_settled,
                created_by,
                created_at,
                updated_by,
                updated_at
            FROM app.tbl_jobcard
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
    try {
        const queryText = `
            SELECT
                part_id AS id,
                part_name AS label,
                rate,
                available_qty
            FROM inv.vw_part_current_stock
            -- WHERE available_qty > 0
            ORDER BY part_name
        `;

        const result = await db.query(queryText);

        res.status(200).json({
            success: true,
            data: result.rows || [],
            error_code: "0"
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Error fetching LoadDDL data.",
            error_code: "1"
        });
    }
};

export const deleteJobCard = async (req: Request, res: Response): Promise<void> => {
    const deleted_by = (req as any).user?.id;
    try {
        const { id } = req.params;
        const result = await db.query(
            `UPDATE app.tbl_jobcard SET is_deleted = TRUE, is_active = FALSE, updated_by = $2, updated_at = NOW() WHERE id = $1 AND is_deleted = FALSE RETURNING id`,
            [Number(id), deleted_by]
        );
        if (result.rowCount === 0) {
            res.status(404).json({ success: false, message: "Job card not found.", error_code: "1" });
            return;
        }
        await db.query(
            `UPDATE app.tbl_jobcard_detail SET is_deleted = TRUE, is_active = FALSE, updated_at = NOW() WHERE jobcard_id = $1 AND is_deleted = FALSE`,
            [Number(id)]
        );
        res.status(200).json({ success: true, message: "Job card deleted successfully.", error_code: "0" });
    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, message: "Could not delete job card.", error_code: "1" });
    }
};

// get the job cards amount for settlement
export const getJobCardSettlementDetail = async (req: Request, res: Response): Promise<void> => {
    try{
        const {id} = req.params;

        const query = "select sum(total) as jobcard_total_amount from app.tbl_jobcard_detail where jobcard_id = $1";

        const summaryQuery = `
            select 
                jc.id as jobcard_number, 
                jc.customer_name,
                jc.vehicle_registration_number
            from app.tbl_jobcard jc
            where jc.is_active and jc.id = $1
        `;

        const result = await db.query(query, [Number(id)]);

        const summary_result = await db.query(summaryQuery, [Number(id)]);

        // final response data
        let final_response = [
            result.rows[0],
            summary_result.rows[0]
        ];

        res.status(200).json({
            success: true,
            data: final_response || [],
            error_code: "0"
        });
    }catch(err){
        console.error("Error fetching total settlement amout of job card.");
        res.status(500).json({
            success: false,
            message: "Error fetching settlement detail data.",
            error_code: "1"
        });
    }
};

// settle the jobcard
export const settleJobCard = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            from_app,
            jobcard_id,
            payment_method,
            card_number,
            card_expiry_date,
            name_on_card,
            settled_amount
        }: JobCardSettlementDTO = req.body;

        // validations
        // prevent re settling the job card
        const reSettleCheckQuery = await db.query(
            `
                select 1 from app.tbl_settlement where job_card_id = $1 and is_active
            `, [Number(jobcard_id)]
        );

        if (reSettleCheckQuery.rowCount && reSettleCheckQuery.rowCount > 0) {
            res.status(409).json({
                success: false,
                error_code: "1",
                message: "Job card has already been settled."
            });
            return;
        };

        const result = await db.transaction(async (client) => {

            // Insert into settlement table
            const settlement = await client.query(
                `
                WITH CTE_INSERT AS (
                    INSERT INTO app.tbl_settlement (
                        job_card_id,
                        payment_method,
                        card_number,
                        card_expiry_date,
                        name_on_card,
                        settled_amount
                    )
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *
                )

                INSERT INTO app.tbl_settlement_log
                SELECT * FROM CTE_INSERT
                RETURNING *;
                `,
                [
                    jobcard_id,
                    payment_method,
                    card_number,
                    card_expiry_date,
                    name_on_card,
                    settled_amount
                ]
            );

            // Update job card as settled
            await client.query(
                `
                UPDATE app.tbl_jobcard
                SET
                    uid = uuid_generate_v4(),
                    is_settled = TRUE,
                    updated_at = NOW()
                WHERE id = $1
                  AND is_active = TRUE;
                `,
                [Number(jobcard_id)]
            );

            // Return data from transaction
            return settlement.rows[0];
        });

        // Transaction has successfully committed here
        res.status(200).json({
            success: true,
            data: result,
            error_code: "0",
            message: "Job card settled successfully."
        });

    } catch (err) {
        console.error("Error settling the job card amount:", err);

        res.status(400).json({
            success: false,
            message: "Could not settle job card.",
            error_code: "1"
        });
    }
};