import { Request, Response } from "express";
import { db } from "../../config/database.js";
import { ValidateBill } from "../../validations/app/BillingValidationHelper/ValidationHelper.js";
// import { CreateBillDTO } from "../../interfaces/app/billing/billing.interface.js";


export const createBill = async (req: Request, res: Response): Promise<void> => {
    try {
        const { jobcard_id, payment_method } = req.body;

        // const dto: CreateBillDTO = {
        //     jobcard_id: jobcard_id,
        //     payment_method: payment_method
        // };

        //#region Validation

        const validation = await ValidateBill(db, jobcard_id, false);

        if (!validation.isValid) {

            res.status(validation.statusCode ?? 400).json({
                success: false,
                errors: validation.errors,
                error_code: "1"
            });

            return;
        }
        //#endregion

        //#region Fetch Job Card Data
        const jobCardResult = await db.query(
            `
            SELECT
                uid,
                customer_name,
                customer_address,
                static_vehicle_id,
                static_vehicle_type_id,
                vehicle_registration_number
            FROM app.tbl_jobcard WHERE id = $1 AND is_active AND is_deleted = false
            `, [jobcard_id]
        );

        if (jobCardResult.rows.length === 0) {

            throw new Error("Job card not found.");
        }

        const jobCard = jobCardResult.rows[0];
        //#endregion

        //#region Fetch Job Card Details
        const jobCardDetailResult = await db.query(
            `
            SELECT
                part.name AS item_name,
                jd.quantity,
                jd.rate,
                jd.total
            FROM app.tbl_jobcard_detail jd
            LEFT JOIN inv.tbl_part part ON part.id = jd.part_id
            WHERE jd.jobcard_id = $1 AND jd.is_deleted = false
            `,[jobcard_id]
        );

        const jobCardDetails = jobCardDetailResult.rows;
        //#endregion

        //#region Insert Bill
        const billResult = await db.query(
            `
            WITH cte_insert AS
            (
                INSERT INTO app.tbl_bill
                (
                    jobcard_id,
                    jobcard_uid,
                    customer_name,
                    customer_address,
                    static_vehicle_type_id,
                    static_vehicle_id,
                    vehicle_number,
                    payment_method,
                    created_by,
                    updated_by
                )
                VALUES
                
                ($1, $2, $3, $4, $5, $6, $7, $8, 0, 0)
                RETURNING *
            )

            INSERT INTO app.tbl_bill_log

            SELECT * FROM cte_insert
            RETURNING *;
            `,
            [
                jobcard_id,
                jobCard.uid,
                jobCard.customer_name,
                jobCard.customer_address,
                jobCard.static_vehicle_type_id,
                jobCard.static_vehicle_id,
                jobCard.vehicle_registration_number,
                payment_method
            ]
        );

        const bill = billResult.rows[0];
        //#endregion

        //#region Insert Bill Details
        const billDetailsJson = JSON.stringify(
            jobCardDetails.map((item: any) => ({
                item_name: item.item_name,
                quantity: item.quantity,
                rate: item.rate,
                total: item.total,
                tax_percentage: 0, // for now inssert 0
                tax_amount: 0 // for now insert 0
            }))
        );

        await db.query(
            `
            WITH cte_insert AS
            (
                INSERT INTO app.tbl_bill_detail
                (
                    bill_id,
                    bill_uid,
                    item_name,
                    quantity,
                    rate,
                    total,
                    tax_percentage,
                    tax_amount,
                    created_by,
                    updated_by
                )

                SELECT
                    $1,
                    $2,
                    item_name,
                    quantity,
                    rate,
                    total,
                    tax_percentage,
                    tax_amount,
                    0,
                    0

                FROM jsonb_to_recordset($3::jsonb)

                AS x
                (
                    item_name TEXT,
                    quantity INT,
                    rate NUMERIC(10,2),
                    total NUMERIC(10,2),
                    tax_percentage INT,
                    tax_amount NUMERIC(10,2)
                )

                RETURNING *
            )

            INSERT INTO app.tbl_bill_detail_log

            SELECT *

            FROM cte_insert;
            `,
            [
                bill.id,
                bill.uid,
                billDetailsJson
            ]
        );

        //#endregion

        res.status(201).json({
            success: true,
            data: bill,
            message: "Bill generated",
            error_code: "0"
        });
    } catch(error) {
        console.error(error);

        res.status(400).json({
            success: false,
            message: "Could not create bill.",
            error_code: "1"
        });

    }
};


export const getBill = async (req: Request, res: Response): Promise<void> => {
    try {

        const { id } = req.params;

        //#region Bill

        const billResult = await db.query(
            `
            SELECT
                id,
                jobcard_id,
                customer_name,
                customer_address,
                static_vehicle_type_id,
                static_vehicle_id,
                vehicle_number,
                payment_method
            FROM app.tbl_bill
            WHERE id = $1
            AND is_active
            AND is_deleted = false
            `,
            [id]
        );

        if (billResult.rows.length === 0) {

            res.status(404).json({
                success: false,
                message: "Bill not found.",
                error_code: "1"
            });

            return;
        }

        const bill = billResult.rows[0];

        //#endregion

        //#region Bill Detail

        const detailResult = await db.query(
            `
            SELECT
                item_name,
                quantity,
                rate,
                total,
                tax_percentage,
                tax_amount
            FROM app.tbl_bill_detail
            WHERE bill_id = $1
            AND is_active
            AND is_deleted = false
            ORDER BY id
            `,
            [id]
        );

        bill.bill_detail = detailResult.rows;

        //#endregion

        res.status(200).json({
            success: true,
            data: bill,
            error_code: "0"
        });

    } catch (error) {
        console.error(error);

        res.status(400).json({
            success: false,
            message: "Could not fetch bill.",
            error_code: "1"
        });

    }
};

export const updateBill = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            id,
            customer_name,
            customer_address,
            static_vehicle_type_id,
            static_vehicle_id,
            vehicle_number,
            payment_method,
            bill_detail
        } = req.body;

        //#region Check Bill

        const billResult = await db.query(
            `
            SELECT id, uid
            FROM app.tbl_bill
            WHERE id = $1
            AND is_active
            AND is_deleted = false
            `,
            [id]
        );

        if (billResult.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Bill not found.",
                error_code: "1"
            });

            return;
        }

        const bill = billResult.rows[0];

        //#endregion

        //#region Update Bill

        const updatedBill = await db.query(
            `
            WITH cte_update AS
            (
                UPDATE app.tbl_bill
                SET
                    customer_name = $2,
                    customer_address = $3,
                    static_vehicle_type_id = $4,
                    static_vehicle_id = $5,
                    vehicle_number = $6,
                    payment_method = $7,
                    updated_by = 0,
                    updated_at = NOW()
                WHERE id = $1

                RETURNING *
            )

            INSERT INTO app.tbl_bill_log

            SELECT * FROM cte_update
            RETURNING *;
            `,
            [
                id,
                customer_name,
                customer_address,
                static_vehicle_type_id,
                static_vehicle_id,
                vehicle_number,
                payment_method
            ]
        );

        //#endregion

        //#region Soft Delete Bill Detail

        const deletedDetail = await db.query(
            `
            WITH cte_update AS
            (
                UPDATE app.tbl_bill_detail
                SET
                    is_active = false,
                    is_deleted = true,
                    updated_by = 0,
                    updated_at = NOW()
                WHERE bill_id = $1
                AND is_deleted = false

                RETURNING *
            )

            INSERT INTO app.tbl_bill_detail_log SELECT * FROM cte_update;
            `,
            [id]
        );

        //#endregion

        //#region Insert New Detail

        const detailJson = JSON.stringify(bill_detail);

        await db.query(
            `
            WITH cte_insert AS
            (
                INSERT INTO app.tbl_bill_detail
                (
                    bill_id,
                    bill_uid,
                    item_name,
                    quantity,
                    rate,
                    total,
                    tax_percentage,
                    tax_amount,
                    created_by,
                    updated_by
                )

                SELECT
                    $1,
                    $2,
                    item_name,
                    quantity,
                    rate,
                    total,
                    tax_percentage,
                    tax_amount,
                    0,
                    0

                FROM jsonb_to_recordset($3::jsonb)

                AS x
                (
                    item_name TEXT,
                    quantity INT,
                    rate NUMERIC(10,2),
                    total NUMERIC(10,2),
                    tax_percentage INT,
                    tax_amount NUMERIC(10,2)
                )

                RETURNING *
            )

            INSERT INTO app.tbl_bill_detail_log

            SELECT *

            FROM cte_insert;
            `,
            [
                id,
                bill.uid,
                detailJson
            ]
        );

        //#endregion

        await db.query("COMMIT");

        res.status(200).json({
            success: true,
            data: updatedBill.rows[0],
            message: "Bill updated",
            error_code: "0"
        });

    } catch (error) {
        console.error(error);

        res.status(400).json({
            success: false,
            message: "Could not update bill.",
            error_code: "1"
        });

    }
};

export const printBill = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Bill Header
        const billResult = await db.query(
            `
            SELECT
                id,
                uid,
                customer_name,
                customer_address,
                vehicle_number,
                payment_method,
                created_at
            FROM app.tbl_bill
            WHERE id = $1
            AND is_active = true
            AND is_deleted = false
            `,
            [id]
        );

        if (billResult.rows.length === 0) {
            res.status(404).send("Bill not found");
            return;
        }

        const bill = billResult.rows[0];

        // Bill Details
        const detailResult = await db.query(
            `
            SELECT
                item_name,
                quantity,
                rate,
                total
            FROM app.tbl_bill_detail
            WHERE bill_id = $1
            AND is_active = true
            AND is_deleted = false
            ORDER BY id
            `,
            [id]
        );

        const items = detailResult.rows;

        const grandTotal = items.reduce(
            (sum, item) => sum + Number(item.total),
            0
        );

        const tableRows = items
            .map(
                (item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.item_name}</td>
                    <td>${item.quantity}</td>
                    <td style="text-align:right">${Number(item.rate).toFixed(2)}</td>
                    <td style="text-align:right">${Number(item.total).toFixed(2)}</td>
                </tr>
            `
            )
            .join("");

        const html = `
                <!DOCTYPE html>
                <html>

                <head>
                <meta charset="UTF-8">

                <title>Invoice</title>

                <style>

                body{
                    font-family: Arial, Helvetica, sans-serif;
                    margin:40px;
                    color:#333;
                }

                .header{
                    text-align:center;
                    border-bottom:2px solid #000;
                    padding-bottom:10px;
                    margin-bottom:20px;
                }

                .company{
                    font-size:26px;
                    font-weight:bold;
                }

                .bill-info{
                    display:flex;
                    justify-content:space-between;
                    margin-bottom:20px;
                }

                .left,
                .right{
                    width:48%;
                }

                table{
                    width:100%;
                    border-collapse:collapse;
                    margin-top:20px;
                }

                th,td{
                    border:1px solid #000;
                    padding:8px;
                }

                th{
                    background:#f2f2f2;
                }

                .total{
                    margin-top:20px;
                    text-align:right;
                    font-size:18px;
                    font-weight:bold;
                }

                .footer{
                    margin-top:60px;
                    text-align:center;
                    border-top:1px solid #999;
                    padding-top:10px;
                    color:#666;
                }

                </style>

                </head>

                <body>

                <div class="header">
                    <div class="company">ABC Automobile Workshop</div>
                    <div>Invoice / Bill</div>
                </div>

                <div class="bill-info">

                    <div class="left">
                        <p><strong>Customer:</strong> ${bill.customer_name}</p>
                        <p><strong>Address:</strong> ${bill.customer_address}</p>
                        <p><strong>Vehicle:</strong> ${bill.vehicle_number}</p>
                    </div>

                    <div class="right">
                        <p><strong>Bill No:</strong> ${bill.uid}</p>
                        <p><strong>Date:</strong> ${new Date(
                            bill.created_at
                        ).toLocaleDateString()}</p>
                        <p><strong>Payment:</strong> ${bill.payment_method}</p>
                    </div>

                </div>

                <table>

                <thead>

                <tr>
                <th width="60">SN</th>
                <th>Item Name</th>
                <th width="90">Qty</th>
                <th width="120">Rate</th>
                <th width="120">Amount</th>
                </tr>

                </thead>

                <tbody>

                ${tableRows}

                </tbody>

                </table>

                <div class="total">
                Grand Total : Rs. ${grandTotal.toFixed(2)}
                </div>

                <div class="footer">
                Thank you for your business.
                </div>

                </body>

                </html>
            `;

        res.setHeader("Content-Type", "text/html");
        res.send(html);

    } catch (error) {
        console.error(error);

        res.status(500).send("Could not generate bill.");
    }
};