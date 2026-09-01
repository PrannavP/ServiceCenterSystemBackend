import ValidationResult from "../../../interfaces/common/ValidationResult.js";

export async function ValidateBill(
    db: any,
    job_card_id: number,
    isForUpdate: boolean
): Promise<ValidationResult>{

    const errors: string[] = [];

    const already_billed_query = await db.query(
        `select 1 from app.tbl_bill where jobcard_id = $1 and is_active`, [Number(job_card_id)]
    );

    if (already_billed_query.rowCount && already_billed_query.rowCount > 0) {
        errors.push("Bill of this job card already has been generated.");
    };

    const already_settled_query = await db.query(
        'select 1 from app.tbl_settlement where job_card_id = $1 and is_active',
        [Number(job_card_id)]
    );

    if (already_settled_query.rowCount && already_settled_query.rowCount == 0) {
        errors.push("Bill of this job card has not been settled.");
    };

    const jobCardResult = await db.query(
        `SELECT id FROM app.tbl_jobcard WHERE id = $1 AND is_active`, [job_card_id]
    );

    if (jobCardResult.rows.length === 0) {
        errors.push("Invalid job card.");
    }

    if (errors.length > 0) {
        return {
            isValid: false,
            statusCode: 409,
            errors
        };
    }

    return {
        isValid: true
    };
};