import { Router } from "express";
import { chat, chatHealth } from "../../controllers/app/chatbot.controller.js";
// import authenticationMiddleware from "../../middlewares/authMiddleware.js";

const router = Router();

// Auth is left optional to match the rest of the app's demo setup.
// To lock the assistant down, uncomment the next line.
// router.use(authenticationMiddleware);

/**
 * @swagger
 * /api/chatbot/chat:
 *   post:
 *     tags:
 *       - APP - Assistant
 *     summary: Ask the in-app AI assistant (Aria)
 *     description: >
 *       Domain-aware assistant for the service center. Answers live questions about
 *       job cards, parts inventory and billing, plus how-to/navigation help. Numbers
 *       are grounded in the database; phrasing is optionally enhanced by Claude when
 *       ANTHROPIC_API_KEY is configured.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: "How many active job cards do we have?"
 *               history:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       example: user
 *                     content:
 *                       type: string
 *                       example: "hi"
 *     responses:
 *       200:
 *         description: Assistant reply with optional data cards, actions and suggestions
 *       400:
 *         description: Message is required
 */
router.post("/chat", chat);

/**
 * @swagger
 * /api/chatbot/health:
 *   get:
 *     tags:
 *       - APP - Assistant
 *     summary: Assistant health / mode
 *     responses:
 *       200:
 *         description: Reports whether the LLM enhancement layer is active
 */
router.get("/health", chatHealth);

export { router as chatbotRoutes };
