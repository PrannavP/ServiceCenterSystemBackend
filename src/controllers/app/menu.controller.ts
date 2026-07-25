import { Request, Response } from "express";
import { db } from "../../config/database.js";

// Define available menus
const menus = [
    {
        id: 1,
        name: "Dashboard",
        path: "/dashboard",
        icon: "dashboard",
        allowedRoles: ["admin", "front_office"]
    },
    {
        id: 2,
        name: "Billing",
        path: "/app/billing",
        icon: "bill",
        allowedRoles: ["admin", "front_office"]
    },
    {
        id: 3,
        name: "Part",
        path: "/inv/part",
        icon: "parts",
        allowedRoles: ["admin"]
    },
    {
        id: 4,
        name: "Receipt",
        path: "/inv/receipt",
        icon: "receipt",
        allowedRoles: ["admin"]
    },
    {
        id: 5,
        name: "Job Card",
        path: "/app/jobcard",
        icon: "card",
        allowedRoles: ["admin", "front_office"]
    }
];

// get menu based on user type
export const getUserBasedMenu = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const get_user_type_sql = `
            SELECT user_type FROM app.tbl_user WHERE id = $1;
        `;

        const user_type_result = await db.query(get_user_type_sql, [Number(id)]);

        if (user_type_result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "User not found."
            });
            return;
        }

        const userType = user_type_result.rows[0].user_type.toLowerCase();

        // Filter menu according to user role, return menus list but dont return the allowed user types key.
        const menus_list = menus.filter(menu => menu.allowedRoles.includes(userType)).map(({ allowedRoles, ...menu }) => menu);

        res.status(200).json({
            success: true,
            data: menus_list
        });

    } catch (error) {
        console.log(error);

        res.status(400).json({
            success: false,
            message: "Could not fetch menu.",
            error_code: "1"
        });
    }
};