import { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { validateJobCard } from '../../validations/app/JobCardValidationHelper/ValidationHelper.js';
import { CreateUpdateJobCardDTO } from '../../interfaces/app/job/jobcard.interface.js';

export const createJobCard = async (req: Request, res: Response): Promise<void> => {
    try{
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
            remarks
        } = req.body;

        // format the request body into prroper interface data
        const dto:CreateUpdateJobCardDTO = {
            customer_name: customer_name,
            customer_address: customer_address,
            contact_number: contact_number,
            static_vehicle_type_id: static_vehicle_type_id,
            static_vehicle_id: static_vehicle_id,
            vehicle_registration_number: vehicle_registration_number,
            odometer_reading: odometer_reading,
            fuel_quantity: fuel_quantity,
            chasis_number: chasis_number,
            problems: JSON.stringify(problems), // converting the stringv value coming into json so can store in db.
            remarks: remarks,
            is_active: true // always active. can be delete if created mistakely.
        };

        // store the validation returned by the function
        const validation = await validateJobCard(db, dto, false);

        // if validation has invalid then throw response error and return
        if(!validation.isValid){
            res.status(validation.statusCode ?? 400).json({
                success: false,
                errors: validation.errors,
                error_code: "1"
            });

            return;
        }

        const queryText = `
            with cte_insert as (
                INSERT INTO app.tbl_jobcard (
                    customer_name, customer_address, contact_number,
                    static_vehicle_type_id, static_vehicle_id,
                    vehicle_registration_number, odometer_reading,
                    fuel_quantity, chasis_number, problems, remarks
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
                )
                
                RETURNING *
            )

            INSERT INTO app.tbl_jobcard_log SELECT * FROM cte_insert;
        `;

        const result = await db.query<any>(queryText, [
            customer_name, customer_address, contact_number,
            static_vehicle_type_id, static_vehicle_id, vehicle_registration_number,
            odometer_reading, fuel_quantity, chasis_number, JSON.stringify(problems), remarks
        ]);

        res.status(201).json({ success: true, data: result.rows[0], error_code: "0" });
    }catch(err){
        console.log(err);
        res.status(400).json({ success: false, message: "Could not job card.", error_code: "1" });
    }
}