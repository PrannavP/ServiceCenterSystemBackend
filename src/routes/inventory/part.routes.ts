import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import {
    createPart,
    getPartById,
    listPart,
    updatePart,
    deletePart,
    uploadPartImage
} from "../../controllers/inventory/part.controller.js";
import authenticationMiddleware from "../../middlewares/authMiddleware.js";

const router = Router();

const partImageDir = path.join(process.cwd(), "uploads", "parts");
fs.mkdirSync(partImageDir, { recursive: true });

const upload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, partImageDir),
        filename: (_req, file, cb) => cb(null, `part-${Date.now()}${path.extname(file.originalname)}`),
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(authenticationMiddleware);

router.post("/create", createPart);

router.get("/get/:id", getPartById);

router.post("/update/:id",updatePart);

router.get("/list", listPart);

router.delete("/delete/:id", deletePart);

router.post("/upload", upload.single("image"), uploadPartImage);

export { router as partRoutes };