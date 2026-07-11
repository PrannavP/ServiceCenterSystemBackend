import { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { validateJobCard } from '../../validations/app/JobCardValidationHelper/ValidationHelper.js';
import { CreateUpdateJobCardDTO } from '../../interfaces/app/job/jobcard.interface.js';

export const createJobCard = async (req: Request, res: Response): Promise<void> => {
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
            detail
        } = req.body;

        // format request body into dto
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
            job_card_detail: detail
        };

        // validate request
        const validation = await validateJobCard(db, dto, false);

        if (!validation.isValid) {
            res.status(validation.statusCode ?? 400).json({
                success: false,
                errors: validation.errors,
                error_code: "1"
            });
            return;
        }

        // insert master record
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
                    remarks
                )
                VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
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
            remarks
        ]);

        const jobCard = masterResult.rows[0];

        // insert detail records
        if (detail != null && detail.length > 0) {

            const detailQuery = `
                WITH cte_insert AS (
                    INSERT INTO app.tbl_jobcard_detail (
                        jobcard_id,
                        jobcard_uid,
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

            await db.query(detailQuery, [ jobCard.id, jobCard.uid, JSON.stringify(detail)]);
        }

        res.status(201).json({success: true, data: jobCard, error_code: "0"});

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
            detail
        } = req.body;

        // format request body into dto
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
            job_card_detail: detail
        };

        // validate request
        const validation = await validateJobCard(db, dto, true);

        if (!validation.isValid) {
            res.status(validation.statusCode ?? 400).json({
                success: false,
                errors: validation.errors,
                error_code: "1"
            });
            return;
        }

        // update master and insert into log
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
                    updated_by = 1
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
            remarks
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

        // Soft delete old detail rows and insert new ones
        if (detail && detail.length > 0) {

            await db.query(
                `
                UPDATE app.tbl_jobcard_detail
                SET
                    is_active = FALSE,
                    is_deleted = TRUE,
                    updated_at = NOW(),
                    updated_by = 1
                WHERE jobcard_id = $1
                  AND is_active = TRUE;
                `,
                [jobCard.id]
            );

            const detailQuery = `
                WITH cte_insert AS (
                    INSERT INTO app.tbl_jobcard_detail (
                        jobcard_id,
                        jobcard_uid,
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
                JSON.stringify(detail)
            ]);
        }

        res.status(200).json({
            success: true,
            data: jobCard,
            error_code: "0"
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

// get jobcard by id
export const getJobcardById = async (req: Request, res: Response): Promise<void> => {
    try{
        const {id} = req.params;

        const mainDataQuery = `
            select id as jobcard_id,
                customer_name, customer_address, contact_number, static_vehicle_id, static_vehicle_type_id, vehicle_registration_number, odometer_reading,
                fuel_quantity, chasis_number, problems, remarks, is_active
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

        // combine 2 results in one object and return
        const data = {
            receipt: mainResult.rows[0],      // single object
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