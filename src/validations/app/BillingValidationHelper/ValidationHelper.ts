import ValidationResult from "../../../interfaces/common/ValidationResult.js";

export async function ValidateBill(
    db: any,
    job_card_id: number,
    isForUpdate: boolean
): Promise<ValidationResult>{

    const errors: string[] = [];

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