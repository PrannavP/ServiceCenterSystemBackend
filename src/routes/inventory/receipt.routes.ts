import { Router } from "express";
import {
    createReceipt,
    getReceiptById,
    loadddl,
    receiptList,
    updateReceipt,
    deleteReceipt
} from "../../controllers/inventory/receipt.controller.js";

import authenticationMiddleware from "../../middlewares/authMiddleware.js";

const router = Router();

router.use(authenticationMiddleware);

router.post("/create", createReceipt);

router.get("/get/:receipt_id", getReceiptById);

router.post("/update/:receipt_id",updateReceipt);

router.get("/list", receiptList);

router.get("/loadddl", authenticationMiddleware, loadddl);

router.delete("/delete/:receipt_id", authenticationMiddleware, deleteReceipt);

export { router as receiptRoute };