import { Request, Response, NextFunction } from "express";
import { verifyJWTToken } from "../helpers/authTokenHelper.js";

const authenticationMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Get token from header
    const token = req.header("x-auth-token");

    if (!token) {
        return res.status(401).json({
            message: "No auth token provided."
        });
    }

    try {
        const decoded = verifyJWTToken(token);

        (req as any).user = decoded;

        next();
    } catch {
        return res.status(401).json({
            message: "Token is not valid."
        });
    }
};

export default authenticationMiddleware;