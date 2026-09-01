import { Router } from "express";
import { billList, createBill, getBill, getBillForPrinting, updateBill, deleteBill } from "../../controllers/app/billing.controller.js";
import authenticationMiddleware from "../../middlewares/authMiddleware.js";

const router = Router();

router.use(authenticationMiddleware);

router.post("/create", createBill);

router.get("/get/:id", getBill);

router.post("/update", updateBill);

router.get("/list", billList);

router.get("/printbill/:bill_id", getBillForPrinting);

router.delete("/delete/:id", deleteBill);

export { router as billingRoutes };