import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { db } from "../../config/database.js";
import { CreateUpdateUserDTO } from "../../interfaces/app/user/user.interface.js";
import { validateUser } from "../../validations/app/UserValidationHelper/ValidationHelper.js";

import { generateJWTToken } from "../../helpers/authTokenHelper.js";

export const registerUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const dto: CreateUpdateUserDTO = {
            username: req.body.username,
            email: req.body.email,
            password: req.body.password,
            full_name: req.body.full_name,
            phone: req.body.phone,
            is_active: req.body.is_active ?? true,
            avatar_url: req.body.avatar_url
        };

        const validation = await validateUser(
            db,
            dto,
            false
        );

        if (!validation.isValid) {
            res.status(validation.statusCode ?? 400).json({
                success: false,
                errors: validation.errors,
                error_code: "1"
            });

            return;
        }

        const hashedPassword = await bcrypt.hash(dto.password,10);

        const currentDate = new Date();

        const queryText = `
            WITH cte_insert AS
            (
                INSERT INTO app.tbl_user
                (username, email, password_hash, full_name, phone, is_active,avatar_url, created_by, created_at, updated_by, updated_at
                )
                VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
            )

            INSERT INTO app.tbl_user_log
            SELECT * FROM cte_insert
            RETURNING *;
        `;

        const result = await db.query(
            queryText,
            [
                dto.username.trim(),
                dto.email.trim().toLowerCase(),
                hashedPassword,
                dto.full_name.trim(),
                dto.phone.trim(),
                dto.is_active,
                dto.avatar_url ?? null,
                0,
                currentDate,
                0,
                currentDate
            ]
        );

        const user = result.rows[0];

        res.status(201).json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                phone: user.phone,
                avatar_url: user.avatar_url
            },
            error_code: "0"
        });

    } catch (error) {
        console.log(error);
        res.status(400).json({
            success: false,
            message: "Could not create user.",
            error_code: "1"
        });
    }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const {username, password} = req.body;

        if (!username || !password) {
            res.status(400).json({
                success: false,
                message: "Username and password are required.",
                error_code: "1"
            });

            return;
        };

        const queryText = `
            SELECT * FROM app.tbl_user WHERE lower(username) = lower($1) AND is_active = true LIMIT 1;
        `;

        const result = await db.query(queryText, [username.trim()]);

        if (result.rows.length === 0) {
            res.status(401).json({
                success: false,
                message: "Invalid username or password.",
                error_code: "1"
            });

            return;
        }

        const user = result.rows[0];

        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            res.status(401).json({
                success: false,
                message: "Invalid username or password.",
                error_code: "1"
            });

            return;
        };

        const token = generateJWTToken(user.id);

        res.status(200).json({
            success: true,
            data: {
                token,
                user: {id: user.id, username: user.username}
            },
            error_code: "0"
        });
    } catch(error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Login failed.",
            error_code: "1"
        });
    }
};

export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id;

        if (!userId) {
            res.status(401).json({ success: false, message: "Not authenticated.", error_code: "1" });
            return;
        }

        const queryText = `
            SELECT id, username, email, full_name, phone, user_type, avatar_url, is_active, created_at
            FROM app.tbl_user
            WHERE id = $1
            LIMIT 1;
        `;

        const result = await db.query(queryText, [userId]);

        if (result.rows.length === 0) {
            res.status(404).json({ success: false, message: "User not found.", error_code: "1" });
            return;
        }

        res.status(200).json({ success: true, data: result.rows[0], error_code: "0" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Could not fetch profile.", error_code: "1" });
    }
};