import { Router } from "express";
import { chat, chatHealth } from "../../controllers/app/chatbot.controller.js";

const router = Router();

router.post("/chat", chat);

router.get("/health", chatHealth);

export { router as chatbotRoutes };
