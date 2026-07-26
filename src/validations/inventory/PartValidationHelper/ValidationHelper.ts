import ValidationResult from "../../../interfaces/common/ValidationResult.js";
import { CreateUpdatePartDTO } from "../../../interfaces/inventory/parts/part.interface.js";

export async function validatePart(
    db: any,
    dto: CreateUpdatePartDTO,
    isForUpdate: boolean
): Promise<ValidationResult> {

    const errors: string[] = [];

    if (!dto.name || dto.name.trim().length < 2 || dto.name.trim().length > 100) {
        errors.push("Name must be between 2 and 100 characters.");
    }

    if (
        !dto.part_number ||
        dto.part_number.trim().length < 2 ||
        dto.part_number.trim().length > 50
    ) {
        errors.push("Part number must be between 2 and 50 characters.");
    }

    if (errors.length > 0) {
        return {
            isValid: false,
            statusCode: 400,
            errors
        };
    }

    const duplicateNameQuery = isForUpdate
        ? `
            SELECT COUNT(*) AS count
            FROM inv.tbl_part
            WHERE lower(name) = lower($1)
              AND is_active
              AND id <> $2
        `
        : `
            SELECT COUNT(*) AS count
            FROM inv.tbl_part
            WHERE lower(name) = lower($1)
              AND is_active
        `;

    const duplicateNameParams = isForUpdate
        ? [dto.name.trim(), dto.id]
        : [dto.name.trim()];

    const duplicateNameResult = await db.query(
        duplicateNameQuery,
        duplicateNameParams
    );

    const duplicateNameCount = Number(
        duplicateNameResult.rows[0].count
    );

    if (duplicateNameCount > 0) {
        errors.push("An active part already exists with this name.");
    }

    const duplicatePartNumberQuery = isForUpdate
        ? `
            SELECT COUNT(*) AS count
            FROM inv.tbl_part
            WHERE lower(part_number) = lower($1)
              AND is_active
              AND id <> $2
        `
        : `
            SELECT COUNT(*) AS count
            FROM inv.tbl_part
            WHERE lower(part_number) = lower($1)
              AND is_active
        `;

    const duplicatePartNumberParams = isForUpdate
        ? [dto.part_number.trim(), dto.id]
        : [dto.part_number.trim()];

    const duplicatePartNumberResult = await db.query(
        duplicatePartNumberQuery,
        duplicatePartNumberParams
    );

    const duplicatePartNumberCount = Number(
        duplicatePartNumberResult.rows[0].count
    );

    if (duplicatePartNumberCount > 0) {
        errors.push("An active part already exists with this part number.");
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
}