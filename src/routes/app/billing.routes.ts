import { Router } from "express";
import { billList, createBill, getBill, getBillForPrinting, updateBill, deleteBill } from "../../controllers/app/billing.controller.js";
import authenticationMiddleware from "../../middlewares/authMiddleware.js";

const router = Router();

router.use(authenticationMiddleware);

/**
 * @swagger
 * /api/billing/create:
 *   post:
 *     security:
 *       - bearerAuth: []
 *
 *     tags:
 *       - APP - Billing
 *
 *     summary: Create bill from job card
 *
 *     description: 
 *       Generates a bill using the job card information.
 *       The system fetches job card details and creates bill header and bill details.
 *
 *     requestBody:
 *       required: true
 *
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *
 *             required:
 *               - job_card_id
 *               - payment_method
 *
 *             properties:
 *
 *               job_card_id:
 *                 type: integer
 *                 example: 1
 *                 description: Job card ID used for generating the bill
 *
 *               payment_method:
 *                 type: string
 *                 example: Cash
 *                 description: Payment method selected by customer
 *
 *
 *     responses:
 *
 *       201:
 *         description: Bill created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 data:
 *                   type: object
 *                   properties:
 *                     uid:
 *                       type: string
 *                       example: "3f8c5a9b-3d9e-4a7d-a8d2-123456789abc"
 *
 *                     id:
 *                       type: integer
 *                       example: 1001
 *
 *                     jobcard_id:
 *                       type: integer
 *                       example: 1
 *
 *                 error_code:
 *                   type: string
 *                   example: "0"
 *
 *
 *       400:
 *         description: Bill creation failed
 *
 *
 *       409:
 *         description: Invalid job card
 *
 */
router.post("/create", createBill);

/**
 * @swagger
 * /api/billing/get/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *
 *     tags:
 *       - APP - Billing
 *
 *     summary: Get bill by ID
 *
 *     description:
 *       Retrieves a bill along with all of its bill detail items.
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Bill ID
 *         example: 1
 *
 *     responses:
 *
 *       200:
 *         description: Bill fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *
 *                     jobcard_id:
 *                       type: integer
 *                       example: 10
 *
 *                     customer_name:
 *                       type: string
 *                       example: John Doe
 *
 *                     customer_address:
 *                       type: string
 *                       example: Kathmandu, Nepal
 *
 *                     static_vehicle_type_id:
 *                       type: integer
 *                       example: 2
 *
 *                     static_vehicle_id:
 *                       type: integer
 *                       example: 5
 *
 *                     vehicle_number:
 *                       type: string
 *                       example: BA-01-PA-1234
 *
 *                     payment_method:
 *                       type: string
 *                       example: Cash
 *
 *                     bill_detail:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           item_name:
 *                             type: string
 *                             example: Engine Oil
 *
 *                           quantity:
 *                             type: integer
 *                             example: 2
 *
 *                           rate:
 *                             type: number
 *                             format: float
 *                             example: 1200
 *
 *                           total:
 *                             type: number
 *                             format: float
 *                             example: 2400
 *
 *                           tax_percentage:
 *                             type: integer
 *                             example: 13
 *
 *                           tax_amount:
 *                             type: number
 *                             format: float
 *                             example: 312
 *
 *                 error_code:
 *                   type: string
 *                   example: "0"
 *
 *       404:
 *         description: Bill not found
 *
 *       400:
 *         description: Could not fetch bill
 */
router.get("/get/:id", getBill);

/**
 * @swagger
 * /api/billing/update:
 *   post:
 *     security:
 *       - bearerAuth: []
 *
 *     tags:
 *       - APP - Billing
 *
 *     summary: Update bill
 *
 *     description:
 *       Updates bill information and replaces all existing bill detail records with the supplied bill detail list.
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *
 *             required:
 *               - id
 *               - customer_name
 *               - customer_address
 *               - static_vehicle_type_id
 *               - static_vehicle_id
 *               - vehicle_number
 *               - payment_method
 *               - bill_detail
 *
 *             properties:
 *               id:
 *                 type: integer
 *                 example: 1
 *
 *               customer_name:
 *                 type: string
 *                 example: John Doe
 *
 *               customer_address:
 *                 type: string
 *                 example: Kathmandu, Nepal
 *
 *               static_vehicle_type_id:
 *                 type: integer
 *                 example: 2
 *
 *               static_vehicle_id:
 *                 type: integer
 *                 example: 5
 *
 *               vehicle_number:
 *                 type: string
 *                 example: BA-01-PA-1234
 *
 *               payment_method:
 *                 type: string
 *                 example: Cash
 *
 *               bill_detail:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - item_name
 *                     - quantity
 *                     - rate
 *                     - total
 *                     - tax_percentage
 *                     - tax_amount
 *                   properties:
 *                     item_name:
 *                       type: string
 *                       example: Engine Oil
 *
 *                     quantity:
 *                       type: integer
 *                       example: 2
 *
 *                     rate:
 *                       type: number
 *                       format: float
 *                       example: 1200
 *
 *                     total:
 *                       type: number
 *                       format: float
 *                       example: 2400
 *
 *                     tax_percentage:
 *                       type: integer
 *                       example: 13
 *
 *                     tax_amount:
 *                       type: number
 *                       format: float
 *                       example: 312
 *
 *     responses:
 *
 *       200:
 *         description: Bill updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 data:
 *                   type: object
 *                   description: Updated bill record
 *
 *                 error_code:
 *                   type: string
 *                   example: "0"
 *
 *       404:
 *         description: Bill not found
 *
 *       400:
 *         description: Could not update bill
 */
router.post("/update", updateBill);

router.get("/list", billList);

router.get("/printbill/:bill_id", getBillForPrinting);

router.delete("/delete/:id", deleteBill);

export { router as billingRoutes };