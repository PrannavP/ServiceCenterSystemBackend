import { Request, Response } from "express";
import { db } from "../../config/database.js";
import { ValidateBill } from "../../validations/app/BillingValidationHelper/ValidationHelper.js";
// import { CreateBillDTO } from "../../interfaces/app/billing/billing.interface.js";


// export const createBill = async (req: Request, res: Response): Promise<void> => {
//     const created_by = (req as any).user?.id;
    
//     try {

//         const { jobcard_id, payment_method } = req.body;

//         // const dto: CreateBillDTO = {
//         //     jobcard_id: jobcard_id,
//         //     payment_method: payment_method
//         // };

//         //#region Validation

//         const validation = await ValidateBill(db, jobcard_id, false);

//         if (!validation.isValid) {

//             res.status(validation.statusCode ?? 400).json({
//                 success: false,
//                 errors: validation.errors,
//                 error_code: "1"
//             });

//             return;
//         }
//         //#endregion

//         //#region Fetch Job Card Data
//         const jobCardResult = await db.query(
//             `
//             SELECT
//                 uid,
//                 customer_name,
//                 customer_address,
//                 static_vehicle_id,
//                 static_vehicle_type_id,
//                 vehicle_registration_number
//             FROM app.tbl_jobcard WHERE id = $1 AND is_active AND is_deleted = false
//             `, [jobcard_id]
//         );

//         if (jobCardResult.rows.length === 0) {

//             throw new Error("Job card not found.");
//         }

//         const jobCard = jobCardResult.rows[0];
//         //#endregion

//         //#region Fetch Job Card Details
//         const jobCardDetailResult = await db.query(
//             `
//             SELECT
//                 part.name AS item_name,
//                 jd.quantity,
//                 jd.rate,
//                 jd.total
//             FROM app.tbl_jobcard_detail jd
//             LEFT JOIN inv.tbl_part part ON part.id = jd.part_id
//             WHERE jd.jobcard_id = $1 AND jd.is_deleted = false
//             `,[jobcard_id]
//         );

//         const jobCardDetails = jobCardDetailResult.rows;
//         //#endregion

//         //#region Insert Bill
//         const billResult = await db.query(
//             `
//             WITH cte_insert AS
//             (
//                 INSERT INTO app.tbl_bill
//                 (
//                     jobcard_id,
//                     jobcard_uid,
//                     customer_name,
//                     customer_address,
//                     static_vehicle_type_id,
//                     static_vehicle_id,
//                     vehicle_number,
//                     payment_method,
//                     created_by,
//                     updated_by
//                 )
//                 VALUES
                
//                 ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
//                 RETURNING *
//             )

//             INSERT INTO app.tbl_bill_log

//             SELECT * FROM cte_insert
//             RETURNING *;
//             `,
//             [
//                 jobcard_id,
//                 jobCard.uid,
//                 jobCard.customer_name,
//                 jobCard.customer_address,
//                 jobCard.static_vehicle_type_id,
//                 jobCard.static_vehicle_id,
//                 jobCard.vehicle_registration_number,
//                 payment_method,
//                 created_by
//             ]
//         );

//         const bill = billResult.rows[0];
//         //#endregion

//         //#region Insert Bill Details
//         const billDetailsJson = JSON.stringify(
//             jobCardDetails.map((item: any) => ({
//                 item_name: item.item_name,
//                 quantity: item.quantity,
//                 rate: item.rate,
//                 total: item.total,
//                 tax_percentage: 0, // for now inssert 0
//                 tax_amount: 0 // for now insert 0
//             }))
//         );

//         await db.query(
//             `
//             WITH cte_insert AS
//             (
//                 INSERT INTO app.tbl_bill_detail
//                 (
//                     bill_id,
//                     bill_uid,
//                     item_name,
//                     quantity,
//                     rate,
//                     total,
//                     tax_percentage,
//                     tax_amount,
//                     created_by,
//                     updated_by
//                 )

//                 SELECT
//                     $1,
//                     $2,
//                     item_name,
//                     quantity,
//                     rate,
//                     total,
//                     tax_percentage,
//                     tax_amount,
//                     $4,
//                     $4

//                 FROM jsonb_to_recordset($3::jsonb)

//                 AS x
//                 (
//                     item_name TEXT,
//                     quantity INT,
//                     rate NUMERIC(10,2),
//                     total NUMERIC(10,2),
//                     tax_percentage INT,
//                     tax_amount NUMERIC(10,2)
//                 )

//                 RETURNING *
//             )

//             INSERT INTO app.tbl_bill_detail_log

//             SELECT *

//             FROM cte_insert;
//             `,
//             [
//                 bill.id,
//                 bill.uid,
//                 billDetailsJson,
//                 created_by
//             ]
//         );

//         //#endregion

//         res.status(201).json({
//             success: true,
//             data: bill,
//             error_code: "0"
//         });
//     } catch(error) {
//         console.error(error);

//         res.status(400).json({
//             success: false,
//             message: "Could not create bill.",
//             error_code: "1"
//         });

//     }
// };

export const createBill = async (req: Request, res: Response): Promise<void> => {
    const created_by = (req as any).user?.id;
    
    try {

        const { jobcard_id, payment_method } = req.body;

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
            FROM app.tbl_jobcard
            WHERE id = $1
            AND is_active
            AND is_deleted = false
            `,
            [jobcard_id]
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
            WHERE jd.jobcard_id = $1
            AND jd.is_deleted = false
            `,
            [jobcard_id]
        );

        const jobCardDetails = jobCardDetailResult.rows;

        //#endregion

        //#region Fetch Tax

        const taxResult = await db.query(
            `
            SELECT
                name,
                code,
                factor
            FROM app.tbl_tax
            WHERE is_active = true
            LIMIT 1
            `
        );

        const taxPercentage = taxResult.rows.length > 0
            ? Number(taxResult.rows[0].factor)
            : 0;

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
                ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
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
                payment_method,
                created_by
            ]
        );

        const bill = billResult.rows[0];

        //#endregion

        //#region Insert Bill Details

        const billDetailsJson = JSON.stringify(
            jobCardDetails.map((item: any) => {

                const total = Number(item.total);

                const taxAmount = Number(
                    ((total * taxPercentage) / 100).toFixed(2)
                );

                return {
                    item_name: item.item_name,
                    quantity: item.quantity,
                    rate: item.rate,
                    total: total,
                    tax_percentage: taxPercentage,
                    tax_amount: taxAmount
                };
            })
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
                    $4,
                    $4

                FROM jsonb_to_recordset($3::jsonb)

                AS x
                (
                    item_name TEXT,
                    quantity INT,
                    rate NUMERIC(10,2),
                    total NUMERIC(10,2),
                    tax_percentage NUMERIC(10,2),
                    tax_amount NUMERIC(10,2)
                )

                RETURNING *
            )

            INSERT INTO app.tbl_bill_detail_log

            SELECT * FROM cte_insert;
            `,
            [
                bill.id,
                bill.uid,
                billDetailsJson,
                created_by
            ]
        );

        //#endregion

        res.status(201).json({
            success: true,
            data: bill,
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

// export const getBill = async (req: Request, res: Response): Promise<void> => {
//     try {

//         const { id } = req.params;

//         //#region Bill

//         const billResult = await db.query(
//             `
//             SELECT
//                 id,
//                 jobcard_id,
//                 customer_name,
//                 customer_address,
//                 static_vehicle_type_id,
//                 static_vehicle_id,
//                 vehicle_number,
//                 payment_method
//             FROM app.tbl_bill
//             WHERE id = $1
//             AND is_active
//             AND is_deleted = false
//             `,
//             [id]
//         );

//         if (billResult.rows.length === 0) {

//             res.status(404).json({
//                 success: false,
//                 message: "Bill not found.",
//                 error_code: "1"
//             });

//             return;
//         }

//         const bill = billResult.rows[0];

//         //#endregion

//         //#region Bill Detail

//         const detailResult = await db.query(
//             `
//             SELECT
//                 item_name,
//                 quantity,
//                 rate,
//                 total,
//                 tax_percentage,
//                 tax_amount
//             FROM app.tbl_bill_detail
//             WHERE bill_id = $1
//             AND is_active
//             AND is_deleted = false
//             ORDER BY id
//             `,
//             [id]
//         );

//         bill.bill_detail = detailResult.rows;

//         //#endregion

//         res.status(200).json({
//             success: true,
//             data: bill,
//             error_code: "0"
//         });

//     } catch (error) {
//         console.error(error);

//         res.status(400).json({
//             success: false,
//             message: "Could not fetch bill.",
//             error_code: "1"
//         });

//     }
// };

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

        const subTotal = bill.bill_detail.reduce(
            (sum: number, item: any) => sum + Number(item.total),
            0
        );

        const totalTax = bill.bill_detail.reduce(
            (sum: number, item: any) => sum + Number(item.tax_amount),
            0
        );

        bill.sub_total = Number(subTotal.toFixed(2));
        bill.total_tax = Number(totalTax.toFixed(2));
        bill.grand_total = Number((subTotal + totalTax).toFixed(2));

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

// export const updateBill = async (req: Request, res: Response): Promise<void> => {
//     const updated_by = (req as any).user?.id;
    
//     try {
//         const {
//             id,
//             customer_name,
//             customer_address,
//             static_vehicle_type_id,
//             static_vehicle_id,
//             vehicle_number,
//             payment_method,
//             bill_detail
//         } = req.body;

//         //#region Check Bill

//         const billResult = await db.query(
//             `
//             SELECT id, uid
//             FROM app.tbl_bill
//             WHERE id = $1
//             AND is_active
//             AND is_deleted = false
//             `,
//             [id]
//         );

//         if (billResult.rows.length === 0) {
//             res.status(404).json({
//                 success: false,
//                 message: "Bill not found.",
//                 error_code: "1"
//             });

//             return;
//         }

//         const bill = billResult.rows[0];

//         //#endregion

//         //#region Update Bill

//         const updatedBill = await db.query(
//             `
//             WITH cte_update AS
//             (
//                 UPDATE app.tbl_bill
//                 SET
//                     customer_name = $2,
//                     customer_address = $3,
//                     static_vehicle_type_id = $4,
//                     static_vehicle_id = $5,
//                     vehicle_number = $6,
//                     payment_method = $7,
//                     updated_by = $8,
//                     updated_at = NOW()
//                 WHERE id = $1

//                 RETURNING *
//             )

//             INSERT INTO app.tbl_bill_log

//             SELECT * FROM cte_update
//             RETURNING *;
//             `,
//             [
//                 id,
//                 customer_name,
//                 customer_address,
//                 static_vehicle_type_id,
//                 static_vehicle_id,
//                 vehicle_number,
//                 payment_method,
//                 updated_by
//             ]
//         );

//         //#endregion

//         //#region Soft Delete Bill Detail

//         const deletedDetail = await db.query(
//             `
//             WITH cte_update AS
//             (
//                 UPDATE app.tbl_bill_detail
//                 SET
//                     is_active = false,
//                     is_deleted = true,
//                     updated_by = 0,
//                     updated_at = NOW()
//                 WHERE bill_id = $1
//                 AND is_deleted = false

//                 RETURNING *
//             )

//             INSERT INTO app.tbl_bill_detail_log SELECT * FROM cte_update;
//             `,
//             [id]
//         );

//         //#endregion

//         //#region Insert New Detail

//         const detailJson = JSON.stringify(bill_detail);

//         await db.query(
//             `
//             WITH cte_insert AS
//             (
//                 INSERT INTO app.tbl_bill_detail
//                 (
//                     bill_id,
//                     bill_uid,
//                     item_name,
//                     quantity,
//                     rate,
//                     total,
//                     tax_percentage,
//                     tax_amount,
//                     created_by,
//                     updated_by
//                 )

//                 SELECT
//                     $1,
//                     $2,
//                     item_name,
//                     quantity,
//                     rate,
//                     total,
//                     tax_percentage,
//                     tax_amount,
//                     $4,
//                     $4

//                 FROM jsonb_to_recordset($3::jsonb)

//                 AS x
//                 (
//                     item_name TEXT,
//                     quantity INT,
//                     rate NUMERIC(10,2),
//                     total NUMERIC(10,2),
//                     tax_percentage INT,
//                     tax_amount NUMERIC(10,2)
//                 )

//                 RETURNING *
//             )

//             INSERT INTO app.tbl_bill_detail_log

//             SELECT *

//             FROM cte_insert;
//             `,
//             [
//                 id,
//                 bill.uid,
//                 detailJson,
//                 updated_by
//             ]
//         );

//         //#endregion

//         await db.query("COMMIT");

//         res.status(200).json({
//             success: true,
//             data: updatedBill.rows[0],
//             error_code: "0"
//         });

//     } catch (error) {
//         console.error(error);

//         res.status(400).json({
//             success: false,
//             message: "Could not update bill.",
//             error_code: "1"
//         });

//     }
// };

export const updateBill = async (req: Request, res: Response): Promise<void> => {
    const updated_by = (req as any).user?.id;
    
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

        //#region Fetch Tax

        const taxResult = await db.query(
            `
            SELECT
                factor
            FROM app.tbl_tax
            WHERE is_active = true
            LIMIT 1
            `
        );

        const taxPercentage = taxResult.rows.length > 0
            ? Number(taxResult.rows[0].factor)
            : 0;

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
                    updated_by = $8,
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
                payment_method,
                updated_by
            ]
        );

        //#endregion

        //#region Soft Delete Bill Detail

        await db.query(
            `
            WITH cte_update AS
            (
                UPDATE app.tbl_bill_detail
                SET
                    is_active = false,
                    is_deleted = true,
                    updated_by = $2,
                    updated_at = NOW()
                WHERE bill_id = $1
                AND is_deleted = false

                RETURNING *
            )

            INSERT INTO app.tbl_bill_detail_log

            SELECT * FROM cte_update;
            `,
            [
                id,
                updated_by
            ]
        );

        //#endregion

        //#region Insert New Detail

        const detailJson = JSON.stringify(
            bill_detail.map((item: any) => {

                const total = Number(item.total);

                const taxAmount = Number(
                    ((total * taxPercentage) / 100).toFixed(2)
                );

                return {
                    item_name: item.item_name,
                    quantity: item.quantity,
                    rate: item.rate,
                    total: total,
                    tax_percentage: taxPercentage,
                    tax_amount: taxAmount
                };
            })
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
                    $4,
                    $4

                FROM jsonb_to_recordset($3::jsonb)

                AS x
                (
                    item_name TEXT,
                    quantity INT,
                    rate NUMERIC(10,2),
                    total NUMERIC(10,2),
                    tax_percentage NUMERIC(10,2),
                    tax_amount NUMERIC(10,2)
                )

                RETURNING *
            )

            INSERT INTO app.tbl_bill_detail_log

            SELECT * FROM cte_insert;
            `,
            [
                id,
                bill.uid,
                detailJson,
                updated_by
            ]
        );

        //#endregion

        res.status(200).json({
            success: true,
            data: updatedBill.rows[0],
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

export const billList = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT
                id AS bill_id,
                customer_name,
                customer_address,
                static_vehicle_type_id,
                static_vehicle_id,
                vehicle_number,
                payment_method,
                is_active,
                created_by,
                created_at,
                updated_by,
                updated_at
            FROM app.tbl_bill
            WHERE is_deleted = FALSE
            ORDER BY created_at DESC;
        `;

        const result = await db.query(query);

        res.status(200).json({
            success: true,
            data: {
                items: result.rows,
                total: result.rowCount
            },
            error_code: "0"
        });
    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            message: "Error while fetching data.",
            error_code: "1"
        });
    }
};

// export const getBillForPrinting = async (req: Request, res: Response): Promise<void> => {
//     try {
//         const { bill_id } = req.params;

//         //#region Bill

//         const billResult = await db.query(
//             `
//             SELECT
//                 b.id,
//                 b.jobcard_id,
//                 b.customer_name,
//                 b.customer_address,
//                 b.vehicle_number,
//                 b.payment_method,
//                 b.created_at
//             FROM app.tbl_bill b
//             WHERE b.id = $1
//                 AND b.is_active
//                 AND b.is_deleted = false
//             `,
//             [bill_id]
//         );

//         if (billResult.rows.length === 0) {
//             res.status(404).send("Bill not found.");
//             return;
//         }

//         const bill = billResult.rows[0];

//         //#endregion

//         //#region Bill Detail

//         const detailResult = await db.query(
//             `
//             SELECT
//                 item_name,
//                 quantity,
//                 rate,
//                 total,
//                 tax_percentage,
//                 tax_amount
//             FROM app.tbl_bill_detail
//             WHERE bill_id = $1
//                 AND is_active
//                 AND is_deleted = false
//             ORDER BY id
//             `,
//             [bill_id]
//         );

//         bill.bill_detail = detailResult.rows;

//         //#endregion

//         const subTotal = bill.bill_detail.reduce(
//             (sum: number, item: any) => sum + Number(item.total),
//             0
//         );

//         const totalTax = bill.bill_detail.reduce(
//             (sum: number, item: any) => sum + Number(item.tax_amount),
//             0
//         );

//         const grandTotal = subTotal + totalTax;

//         const html = `
// <!DOCTYPE html>
// <html>
// <head>
//     <title>Invoice #${bill.id}</title>
//     <style>
//         body {
//             font-family: Arial, sans-serif;
//             margin: 30px;
//             color: #333;
//         }

//         table {
//             width: 100%;
//             border-collapse: collapse;
//             margin-top: 20px;
//         }

//         th, td {
//             border: 1px solid #000;
//             padding: 8px;
//         }

//         th {
//             background: #f2f2f2;
//         }

//         .right {
//             text-align: right;
//         }
//     </style>
// </head>
// <body>

//     <h2 style="text-align:center;">INVOICE</h2>

//     <p><strong>Bill No:</strong> ${bill.id}</p>
//     <p><strong>Customer:</strong> ${bill.customer_name}</p>
//     <p><strong>Address:</strong> ${bill.customer_address ?? ""}</p>
//     <p><strong>Vehicle No:</strong> ${bill.vehicle_number}</p>
//     <p><strong>Payment:</strong> ${bill.payment_method}</p>

//     <table>
//         <thead>
//             <tr>
//                 <th>#</th>
//                 <th>Item</th>
//                 <th>Qty</th>
//                 <th>Rate</th>
//                 <th>Tax %</th>
//                 <th>Tax</th>
//                 <th>Total</th>
//             </tr>
//         </thead>
//         <tbody>
//             ${bill.bill_detail
//                 .map(
//                     (item: any, index: number) => `
//                     <tr>
//                         <td>${index + 1}</td>
//                         <td>${item.item_name}</td>
//                         <td>${item.quantity}</td>
//                         <td>${item.rate}</td>
//                         <td>${item.tax_percentage}</td>
//                         <td>${Number(item.tax_amount).toFixed(2)}</td>
//                         <td>${Number(item.total).toFixed(2)}</td>
//                     </tr>
//                 `
//                 )
//                 .join("")}
//         </tbody>
//         <tfoot>
//             <tr>
//                 <td colspan="6" class="right"><strong>Subtotal</strong></td>
//                 <td>${subTotal.toFixed(2)}</td>
//             </tr>
//             <tr>
//                 <td colspan="6" class="right"><strong>Total Tax</strong></td>
//                 <td>${totalTax.toFixed(2)}</td>
//             </tr>
//             <tr>
//                 <td colspan="6" class="right"><strong>Grand Total</strong></td>
//                 <td><strong>${grandTotal.toFixed(2)}</strong></td>
//             </tr>
//         </tfoot>
//     </table>

// </body>
// </html>
// `;

//         res.status(200).json({ message: "Print success", data: html, error_code: "0"  })

//     } catch (error) {
//         console.error(error);

//         res.status(500).send("Could not generate bill.");
//     }
// };

export const getBillForPrinting = async (req: Request, res: Response): Promise<void> => {
    try {
        const { bill_id } = req.params;

        //#region Bill

        const billResult = await db.query(
            `
            SELECT
                b.id,
                b.jobcard_id,
                b.customer_name,
                b.customer_address,
                b.vehicle_number,
                b.payment_method,
                b.created_at
            FROM app.tbl_bill b
            WHERE b.id = $1
            AND b.is_active
            AND b.is_deleted = false
            `,
            [bill_id]
        );

        if (billResult.rows.length === 0) {
            res.status(404).send("Bill not found.");
            return;
        }

        const bill = billResult.rows[0];

        //#endregion

        //#region Tax

        const taxResult = await db.query(
            `
            SELECT
                name,
                code,
                factor
            FROM app.tbl_tax
            WHERE is_active = true
            LIMIT 1
            `
        );

        const tax = taxResult.rows.length > 0
            ? taxResult.rows[0]
            : {
                name: "",
                code: "",
                factor: 0
            };

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
            [bill_id]
        );

        bill.bill_detail = detailResult.rows;

        //#endregion

        const subTotal = bill.bill_detail.reduce(
            (sum: number, item: any) => sum + Number(item.total),
            0
        );

        const totalTax = bill.bill_detail.reduce(
            (sum: number, item: any) => sum + Number(item.tax_amount),
            0
        );

        const grandTotal = subTotal + totalTax;

        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Invoice #${bill.id}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 30px;
            color: #333;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        th, td {
            border: 1px solid #000;
            padding: 8px;
        }

        th {
            background: #f2f2f2;
        }

        .right {
            text-align: right;
        }
    </style>
</head>

<body>

<h2 style="text-align:center;">INVOICE</h2>

<p><strong>Bill No:</strong> ${bill.id}</p>
<p><strong>Customer:</strong> ${bill.customer_name}</p>
<p><strong>Address:</strong> ${bill.customer_address ?? ""}</p>
<p><strong>Vehicle No:</strong> ${bill.vehicle_number}</p>
<p><strong>Payment:</strong> ${bill.payment_method}</p>

<table>
<thead>
<tr>
    <th>#</th>
    <th>Item</th>
    <th>Qty</th>
    <th>Rate</th>
    <th>Tax %</th>
    <th>Tax Amount</th>
    <th>Total</th>
</tr>
</thead>

<tbody>
${bill.bill_detail.map((item: any, index: number) => `
<tr>
    <td>${index + 1}</td>
    <td>${item.item_name}</td>
    <td>${item.quantity}</td>
    <td>${Number(item.rate).toFixed(2)}</td>
    <td>${Number(item.tax_percentage).toFixed(2)}</td>
    <td>${Number(item.tax_amount).toFixed(2)}</td>
    <td>${Number(item.total).toFixed(2)}</td>
</tr>
`).join("")}
</tbody>

<tfoot>

<tr>
    <td colspan="6" class="right">
        <strong>Subtotal</strong>
    </td>
    <td>${subTotal.toFixed(2)}</td>
</tr>

<tr>
    <td colspan="6" class="right">
        <strong>${tax.name} (${tax.code}) ${Number(tax.factor).toFixed(2)}%</strong>
    </td>
    <td>${totalTax.toFixed(2)}</td>
</tr>

<tr>
    <td colspan="6" class="right">
        <strong>Grand Total</strong>
    </td>
    <td>
        <strong>${grandTotal.toFixed(2)}</strong>
    </td>
</tr>

</tfoot>

</table>

</body>
</html>
`;

        res.status(200).json({
            message: "Print success",
            data: html,
            error_code: "0"
        });

    } catch (error) {
        console.error(error);

        res.status(500).send("Could not generate bill.");
    }
};