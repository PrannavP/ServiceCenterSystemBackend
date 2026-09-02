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

        const token = generateJWTToken(user.id, user.user_type);

        res.status(200).json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id, 
                    username: user.username,
                    user_type: user.user_type,
                    force_password_change: user.force_password_change || false
                }
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

export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username } = req.body;
        if (!username) {
            res.status(400).json({ success: false, message: "Username or email is required.", error_code: "1" });
            return;
        }

        const queryText = `SELECT id, email FROM app.tbl_user WHERE lower(username) = lower($1) OR lower(email) = lower($1) LIMIT 1`;
        const result = await db.query(queryText, [username.trim()]);
        
        if (result.rows.length === 0) {
            // Return success even if user not found to prevent user enumeration
            res.status(200).json({ success: true, message: "If an account exists, a reset code has been sent.", error_code: "0" });
            return;
        }

        const user = result.rows[0];
        
        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Expiration time: 15 mins from now
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        const updateQuery = `UPDATE app.tbl_user SET reset_token = $1, reset_token_expires = $2 WHERE id = $3`;
        await db.query(updateQuery, [otp, expiresAt, user.id]);

        // Note: In a real environment, you would use nodemailer or AWS SES to send this OTP to user.email
        // For demonstration, we'll log it
        console.log(`[Email Service Mock] Sending OTP ${otp} to ${user.email}`);

        res.status(200).json({ success: true, message: "Reset code generated and sent.", error_code: "0" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Could not request password reset.", error_code: "1" });
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, otp, newPassword } = req.body;
        
        if (!username || !otp || !newPassword) {
            res.status(400).json({ success: false, message: "Username, OTP, and new password are required.", error_code: "1" });
            return;
        }

        const queryText = `
            SELECT id, reset_token_expires 
            FROM app.tbl_user 
            WHERE (lower(username) = lower($1) OR lower(email) = lower($1)) 
            AND reset_token = $2 
            LIMIT 1
        `;
        const result = await db.query(queryText, [username.trim(), otp]);

        if (result.rows.length === 0) {
            res.status(400).json({ success: false, message: "Invalid reset code.", error_code: "1" });
            return;
        }

        const user = result.rows[0];
        const now = new Date();

        if (user.reset_token_expires && now > new Date(user.reset_token_expires)) {
            res.status(400).json({ success: false, message: "Reset code has expired.", error_code: "1" });
            return;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        const updateQuery = `
            UPDATE app.tbl_user 
            SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL 
            WHERE id = $2
        `;
        await db.query(updateQuery, [hashedPassword, user.id]);

        res.status(200).json({ success: true, message: "Password has been successfully reset.", error_code: "0" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Could not reset password.", error_code: "1" });
    }
};

export const createServiceCenter = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, email, password, full_name, phone } = req.body;
        
        // Ensure user is admin (you would normally get this from req.user set by auth middleware)
        // For now, since the admin dashboard calls this, we'll assume it's protected by middleware.
        
        if (!username || !email || !password || !full_name) {
            res.status(400).json({
                success: false,
                message: "Missing required fields.",
                error_code: "1"
            });
            return;
        }

        // Check if user already exists
        const checkQuery = `SELECT id FROM app.tbl_user WHERE lower(username) = lower($1) OR lower(email) = lower($2)`;
        const checkResult = await db.query(checkQuery, [username.trim(), email.trim()]);
        
        if (checkResult.rows.length > 0) {
            res.status(400).json({
                success: false,
                message: "Username or email already exists.",
                error_code: "1"
            });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const insertQuery = `
            INSERT INTO app.tbl_user (
                username, email, password_hash, full_name, phone, user_type, force_password_change, is_active, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, 'service_center', true, true, NOW(), NOW()
            ) RETURNING id;
        `;
        
        const insertResult = await db.query(insertQuery, [
            username.trim(), 
            email.trim(), 
            hashedPassword, 
            full_name.trim(), 
            phone?.trim() || null
        ]);

        res.status(201).json({
            success: true,
            message: "Service center account created successfully. They will be forced to change their password on first login.",
            data: { id: insertResult.rows[0].id },
            error_code: "0"
        });
    } catch (error) {
        console.log("Error creating service center:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create service center account.",
            error_code: "1"
        });
    }
};

export const getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const queryText = `
            SELECT id, username, email, full_name, phone, user_type, is_active, created_at 
            FROM app.tbl_user 
            ORDER BY created_at DESC
        `;
        const result = await db.query(queryText);
        
        res.status(200).json({
            success: true,
            items: result.rows,
            error_code: "0"
        });
    } catch (error) {
        console.log("Error fetching users:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch users.",
            error_code: "1"
        });
    }
};

export const resetPasswordForced = async (req: Request, res: Response): Promise<void> => {
    try {
        // user.id is set by authenticationMiddleware
        const userId = (req as any).user?.id || (req as any).user?.userId;
        const { newPassword } = req.body;
        
        if (!userId || !newPassword) {
            res.status(400).json({ success: false, message: "User ID and new password are required.", error_code: "1" });
            return;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        const updateQuery = `
            UPDATE app.tbl_user 
            SET password_hash = $1, force_password_change = false, updated_at = NOW()
            WHERE id = $2
        `;
        await db.query(updateQuery, [hashedPassword, userId]);

        res.status(200).json({ success: true, message: "Password updated successfully.", error_code: "0" });
    } catch (error) {
        console.log("Error forcing password reset:", error);
        res.status(500).json({ success: false, message: "Could not update password.", error_code: "1" });
    }
};

export const updateServiceCenter = async (req: Request, res: Response): Promise<void> => {
    try {
        const authUser = (req as any).user;
        const targetId = req.params.id;
        
        // Only admin can update other users, otherwise user must update themselves
        if (authUser.user_type !== 'admin' && authUser.id.toString() !== targetId) {
            res.status(403).json({ success: false, message: "Unauthorized to update this user", error_code: "1" });
            return;
        }

        const { username, email, full_name, phone, password, avatar_url } = req.body;
        
        if (!username || !email || !full_name) {
            res.status(400).json({ success: false, message: "Username, email and full_name are required.", error_code: "1" });
            return;
        }

        let updateQuery = `
            UPDATE app.tbl_user 
            SET username = $1, email = $2, full_name = $3, phone = $4, avatar_url = $5, updated_at = NOW()
        `;
        const values: any[] = [username.trim(), email.trim(), full_name.trim(), phone?.trim() || null, avatar_url || null];
        
        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateQuery += `, password_hash = $6 `;
            values.push(hashedPassword);
        }
        
        updateQuery += ` WHERE id = $${values.length + 1} RETURNING id, username, email, full_name, phone, avatar_url, user_type`;
        values.push(targetId);

        const result = await db.query(updateQuery, values);
        
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, message: "User not found", error_code: "1" });
            return;
        }

        res.status(200).json({ 
            success: true, 
            message: "User profile updated successfully.", 
            data: result.rows[0],
            error_code: "0" 
        });
    } catch (error) {
        console.log("Error updating user:", error);
        res.status(500).json({ success: false, message: "Failed to update profile.", error_code: "1" });
    }
};