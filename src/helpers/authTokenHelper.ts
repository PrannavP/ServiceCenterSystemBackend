import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET_KEY;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET_KEY is not defined");
}

const JWT_EXPIRATION_TIME = 2 * 24 * 60 * 60;

export const generateJWTToken = (userUUID: any) => {
    return jwt.sign(
        { id: userUUID },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION_TIME }
    );
};

export const verifyJWTToken = (token: string) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        throw new Error("Invalid JWT Token.");
    }
};