import { Request, Response } from "express";
import { db } from "../../config/database.js";

export const getDashboardSummary = async (_req: Request, res: Response): Promise<void> => {
    try {
        const countsQ = `
            SELECT
                (SELECT COUNT(*) FROM app.tbl_jobcard WHERE is_deleted = false AND is_active) AS active_jobs,
                (SELECT COUNT(*) FROM app.tbl_jobcard WHERE is_deleted = false AND created_at::date = CURRENT_DATE) AS created_today,
                (SELECT COUNT(DISTINCT customer_name) FROM app.tbl_jobcard WHERE is_deleted = false) AS total_customers,
                (SELECT COUNT(*) FROM inv.tbl_part WHERE is_deleted = false) AS total_parts,
                (SELECT COUNT(*) FROM app.tbl_bill WHERE is_deleted = false) AS bill_count,
                (SELECT COUNT(*) FROM app.tbl_jobcard j
                    WHERE j.is_deleted = false
                    AND NOT EXISTS (SELECT 1 FROM app.tbl_bill b WHERE b.jobcard_id = j.id AND b.is_deleted = false)
                ) AS pending_billing;
        `;

        const revenueQ = `
            SELECT
                COALESCE(SUM(bd.total + bd.tax_amount), 0) AS revenue_total,
                COALESCE(SUM(CASE WHEN b.created_at >= date_trunc('month', CURRENT_DATE)
                    THEN bd.total + bd.tax_amount ELSE 0 END), 0) AS revenue_month
            FROM app.tbl_bill b
            LEFT JOIN app.tbl_bill_detail bd ON bd.bill_id = b.id AND bd.is_deleted = false
            WHERE b.is_deleted = false;
        `;

        const revenueSeriesQ = `
            WITH days AS (
                SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day')::date AS d
            )
            SELECT to_char(days.d, 'Dy') AS name,
                   COALESCE(SUM(bd.total + bd.tax_amount), 0)::float AS revenue
            FROM days
            LEFT JOIN app.tbl_bill b ON b.created_at::date = days.d AND b.is_deleted = false
            LEFT JOIN app.tbl_bill_detail bd ON bd.bill_id = b.id AND bd.is_deleted = false
            GROUP BY days.d ORDER BY days.d;
        `;

        const jobcardSeriesQ = `
            WITH days AS (
                SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day')::date AS d
            )
            SELECT to_char(days.d, 'Dy') AS name, COUNT(j.id)::int AS count
            FROM days
            LEFT JOIN app.tbl_jobcard j ON j.created_at::date = days.d AND j.is_deleted = false
            GROUP BY days.d ORDER BY days.d;
        `;

        const recentQ = `
            SELECT id, customer_name, vehicle_registration_number, created_at
            FROM app.tbl_jobcard
            WHERE is_deleted = false
            ORDER BY created_at DESC
            LIMIT 6;
        `;

        const [counts, revenue, revenueSeries, jobcardSeries, recent] = await Promise.all([
            db.query(countsQ),
            db.query(revenueQ),
            db.query(revenueSeriesQ),
            db.query(jobcardSeriesQ),
            db.query(recentQ),
        ]);

        const c = counts.rows[0] ?? {};
        const r = revenue.rows[0] ?? {};

        res.status(200).json({
            success: true,
            data: {
                activeJobs: Number(c.active_jobs ?? 0),
                createdToday: Number(c.created_today ?? 0),
                totalCustomers: Number(c.total_customers ?? 0),
                totalParts: Number(c.total_parts ?? 0),
                billCount: Number(c.bill_count ?? 0),
                pendingBilling: Number(c.pending_billing ?? 0),
                revenueTotal: Number(r.revenue_total ?? 0),
                revenueMonth: Number(r.revenue_month ?? 0),
                revenueSeries: revenueSeries.rows,
                jobcardSeries: jobcardSeries.rows,
                recent: recent.rows,
            },
            error_code: "0",
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Could not fetch dashboard summary.", error_code: "1" });
    }
};
