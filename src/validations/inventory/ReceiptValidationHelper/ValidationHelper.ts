import ValidationResult from "../../../interfaces/common/ValidationResult.js";
import { CreateUpdateReceiptDTO } from "../../../interfaces/inventory/receipt/receipt.interface.js";

export async function validateReceipt(
    db: any,
    dto: CreateUpdateReceiptDTO,
    isForUpdate: boolean
): Promise<ValidationResult>{

    const errors: string[] = [];

    if (!dto.remarks?.trim() || dto.remarks.trim().length > 100) {
        errors.push("Remarks must have at most 100 characters.");
    }

    if (!dto.number?.trim() || dto.number.trim().length > 50) {
        errors.push("Number must have at most 50 characters.");
    }

    const duplicateReceiptNumberQuery = isForUpdate
        ? `
            SELECT COUNT(*) AS count
            FROM inv.tbl_receipt
            WHERE lower(number) = lower($1)
              AND is_active
              AND id <> $2
        `
        : `
            SELECT COUNT(*) AS count
            FROM inv.tbl_receipt
            WHERE lower(number) = lower($1)
              AND is_active
        `;

    const duplicateNumberParams = isForUpdate
        ? [dto.number?.trim(), dto.id]
        : [dto.number?.trim()];

    const duplicateReceiptNumberResult = await db.query(
        duplicateReceiptNumberQuery,
        duplicateNumberParams
    );

    const duplicatePartNumberCount = Number(
        duplicateReceiptNumberResult.rows[0].count
    );

    if (duplicatePartNumberCount > 0) {
        errors.push("An active receipt already exists with this receipt number.");
    }

    var validPartsResult = await db.query(
        `select id from inv.tbl_part where is_active`
    );

    const validPartIds = new Set(
        validPartsResult.rows.map((row: any) => row.id)
    );

    dto.detail.forEach(element => {
        if(!validPartIds.has(element.part_id)){
            errors.push(`Invalid part_id: ${element.part_id}`);
        }

        if(element.quantity < 1){
            errors.push("Quanity should be at least 1");
        }
    });

    if (errors.length > 0) {
        return { isValid: false, statusCode: 409, errors };
    }

    return { isValid: true };
}