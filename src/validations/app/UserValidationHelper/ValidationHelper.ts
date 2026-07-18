import ValidationResult from "../../../interfaces/common/ValidationResult.js";
import { CreateUpdateUserDTO } from "../../../interfaces/app/user/user.interface.js";

export async function validateUser(
    db:any,
    dto: CreateUpdateUserDTO,
    isForUpdate: boolean
): Promise<ValidationResult>{
    const errors: string [] = [];

    if (!dto.username || dto.username.trim().length < 2 || dto.username.trim().length > 50) {
        errors.push("Username must be between 2 and 50 characters.");
    }

    if (!dto.phone || dto.phone.trim().length !== 10) {
        errors.push("Phone number must be 10 digits.");
    }

    if (!dto.email || dto.email.trim().length < 2 || dto.email.trim().length > 50) {
        errors.push("Email must be between 2 and 50 characters.");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!dto.email || !emailRegex.test(dto.email.trim())) {
        errors.push("Invalid email address.");
    }

    if (!dto.full_name || dto.full_name.trim().length < 2 || dto.full_name.trim().length > 100) {
        errors.push("Full name must be between 2 and 100 characters.");
    }

    if (!dto.password || dto.password.trim().length < 2 || dto.password.trim().length > 100) {
        errors.push("Password must be between 2 and 100 characters.");
    }

    // duplicate checks
    const duplicateUsernameQuery = isForUpdate
        ? `
            SELECT COUNT(*) AS count
            FROM app.tbl_user
            WHERE lower(username) = lower($1)
              AND is_active
              AND id <> $2
        `
        : `
            SELECT COUNT(*) AS count
            FROM app.tbl_user
            WHERE lower(username) = lower($1)
              AND is_active
        `;

    const duplicateUsernameParams = isForUpdate
        ? [dto.username.trim(), dto.id]
        : [dto.username.trim()];

    const duplicateUsernameResult = await db.query(
        duplicateUsernameQuery,
        duplicateUsernameParams
    );

    const duplicateNameCount = Number(
        duplicateUsernameResult.rows[0].count
    );

    if (duplicateNameCount > 0) {
        errors.push("An active user already exists with this username.");
    }

    const duplicateEmailQuery = isForUpdate
        ? `
            SELECT COUNT(*) AS count
            FROM app.tbl_user
            WHERE email = $1
              AND is_active
              AND id <> $2
              AND is_deleted = false
        `
        : `
            SELECT COUNT(*) AS count
            FROM app.tbl_user
            WHERE email = $1
              AND is_deleted = false
        `;

    const duplicateEmailParams = isForUpdate
        ? [dto.email.trim(), dto.id]
        : [dto.email.trim()];

    const duplicateEmailResult = await db.query(
        duplicateEmailQuery,
        duplicateEmailParams
    );

    const duplicateEmailCount = Number(
        duplicateEmailResult.rows[0].count
    );

    if (duplicateEmailCount > 0) {
        errors.push("An active user already exists with this email.");
    }

    if (errors.length > 0) {
        return {
            isValid: false,
            statusCode: 400,
            errors
        };
    }

    return {
        isValid: true
    };
}