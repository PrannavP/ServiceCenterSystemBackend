import { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { validateJobCard } from '../../validations/app/JobCardValidationHelper/ValidationHelper.js';
import { CreateUpdateJobCardDTO } from '../../interfaces/app/job/jobcard.interface.js';

export const createJobCard = async (req: Request, res: Response): Promise<void> => {
    // let created_by = (req as any).user?.id;
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
            job_card_detail: details
        };

        // COMMENTED THE VALIDATION FOR NOW BECAUSE WHEN  CREATING FROM OCR APP SOME DATAS ARE NOT COMING SO FOR TESTING PURPOSE.
        // UNCOMMENT THIS SOON!!
        // TODO

        // validate request
        // const validation = await validateJobCard(db, dto, false);

        // if (!validation.isValid) {
        //     res.status(validation.statusCode ?? 400).json({
        //         success: false,
        //         errors: validation.errors,
        //         error_code: "1"
        //     });
        //     return;
        // }

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

        // insert detail records
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

            await db.query(detailQuery, [ jobCard.id, jobCard.uid, JSON.stringify(details), created_by]);
        }

        res.status(201).json({success: true, data: jobCard, error_code: "0", message: "Created job card successfully"});

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
            job_card_detail: details
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

        // Soft delete old detail rows and insert new ones
        if (details && details.length > 0) {
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

// list all jobcards
// currenttly no filters for final internal demo
// will add in external final demo
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

// loadddl
export const loadddl = async (req: Request, res: Response): Promise<void> => {
    try{
        const queryText = 'SELECT part_id as id, part_name as label, rate, available_qty FROM inv.fn_get_part_available_stock() where available_qty > 0';
    
        const result = await db.query(queryText);
        
        res.status(200).json({ success: true, data: result.rows|| [], error_code: "0" });
    }catch (error){
        console.error(error);
        res.status(500).json({ success: false, message: 'Error fetching LoadDDL data.', error_code: "1" });
  }
};