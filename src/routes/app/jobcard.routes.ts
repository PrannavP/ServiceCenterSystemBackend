import { Router } from "express";
import {
    createJobCard,
    updateJobCard,
    getJobcardById,
    jobCardList,
    loadddl,
    deleteJobCard,
    getJobCardSettlementDetail,
    settleJobCard
} from "../../controllers/app/jobcard.controller.js";

import authenticationMiddleware from "../../middlewares/authMiddleware.js";

const router = Router();

router.post("/create", createJobCard);

router.post("/update/:id", authenticationMiddleware, updateJobCard);

router.get("/get/:id", authenticationMiddleware, getJobcardById);

router.get("/list", authenticationMiddleware, jobCardList);

router.get("/loadddl", authenticationMiddleware, loadddl);

router.delete("/delete/:id", authenticationMiddleware, deleteJobCard);

router.get("/settlementdetail/:id", authenticationMiddleware, getJobCardSettlementDetail);

router.post("/settle", authenticationMiddleware, settleJobCard);

export { router as jobcardRoutes };