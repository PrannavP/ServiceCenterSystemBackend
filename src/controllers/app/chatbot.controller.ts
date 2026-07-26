import { Request, Response } from "express";
import type {
    ChatReply,
    ChatTurn,
    ToolResult,
} from "../../interfaces/app/chatbot/chatbot.interface.js";
import { detectIntent } from "../../services/chatbot/intent.js";
import {
    jobcardStats,
    partsOverview,
    lowStock,
    searchPart,
    billingSummary,
} from "../../services/chatbot/tools.js";
import { KNOWLEDGE_BASE, ASSISTANT_NAME, PRODUCT_NAME } from "../../services/chatbot/knowledgeBase.js";
import { enhanceReply, llmEnabled } from "../../services/chatbot/llmProvider.js";

const DEFAULT_SUGGESTIONS = [
    "How many job cards do we have?",
    "Show low stock parts",
    "Revenue this month",
    "How do I create a job card?",
];

function matchKnowledge(message: string) {
    const text = message.toLowerCase();
    let best: { entry: (typeof KNOWLEDGE_BASE)[number]; score: number } | null = null;
    for (const entry of KNOWLEDGE_BASE) {
        let score = 0;
        for (const kw of entry.keywords) if (text.includes(kw)) score += kw.length > 4 ? 2 : 1;
        if (score > 0 && (!best || score > best.score)) best = { entry, score };
    }
    return best;
}

async function buildBaseReply(message: string, history: ChatTurn[]): Promise<ChatReply> {
    const intent = detectIntent(message);

    const toolMap: Partial<Record<string, () => Promise<ToolResult>>> = {
        jobcard_stats: jobcardStats,
        parts_overview: partsOverview,
        low_stock: () => lowStock(5),
        billing_summary: billingSummary,
    };

    let tool: ToolResult | null = null;

    if (intent.name === "part_search" && intent.arg) {
        tool = await searchPart(intent.arg);
    } else if (toolMap[intent.name]) {
        tool = await toolMap[intent.name]!();
    }

    if (tool) {
        return {
            reply: tool.summary,
            cards: tool.cards,
            actions: tool.actions,
            suggestions: tool.suggestions,
            intent: intent.name,
            source: "rules",
        };
    }

    if (intent.name === "greeting") {
        return {
            reply: `Hi! I'm ${ASSISTANT_NAME}, your ${PRODUCT_NAME} assistant. I can pull live numbers on job cards, parts and billing, or help you find your way around. What do you need?`,
            cards: [],
            actions: [],
            suggestions: DEFAULT_SUGGESTIONS,
            intent: "greeting",
            source: "rules",
        };
    }

    if (intent.name === "smalltalk") {
        return {
            reply: "Happy to help! Anything else you'd like to checkf job cards, stock, or billing?",
            cards: [],
            actions: [],
            suggestions: DEFAULT_SUGGESTIONS,
            intent: "smalltalk",
            source: "rules",
        };
    }

    if (intent.name === "help") {
        return {
            reply:
                `I'm ${ASSISTANT_NAME}. I can answer things like:\n` +
                "• “How many job cards do we have?”\n" +
                "• “Show low stock parts” or “Do we have brake pads?”\n" +
                "• “What's our revenue this month?”\n" +
                "• “How do I create a job card?”\n" +
                "I read live data straight from your service center just ask.",
            cards: [],
            actions: [
                { label: "Dashboard", path: "/dashboard" },
                { label: "Job cards", path: "/app/jobcard" },
            ],
            suggestions: DEFAULT_SUGGESTIONS,
            intent: "help",
            source: "rules",
        };
    }

    const kb = matchKnowledge(message);
    if (kb) {
        const actions = kb.entry.path
            ? [{ label: kb.entry.pathLabel ?? "Open", path: kb.entry.path }]
            : [];
        return {
            reply: kb.entry.answer,
            cards: [],
            actions,
            suggestions: DEFAULT_SUGGESTIONS,
            intent: "knowledge",
            source: "rules",
        };
    }

    return {
        reply:
            "I'm not sure about that one yet. I'm best with live figures on job cards, parts and billing, and with how-to questions about the system. Try one of the suggestions below.",
        cards: [],
        actions: [],
        suggestions: DEFAULT_SUGGESTIONS,
        intent: "fallback",
        source: "rules",
    };
}

export const chat = async (req: Request, res: Response): Promise<void> => {
    try {
        const message: string = (req.body?.message ?? "").toString();
        const history: ChatTurn[] = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : [];

        if (!message.trim()) {
            res.status(400).json({ success: false, message: "Message is required.", error_code: "1" });
            return;
        }

        const base = await buildBaseReply(message, history);

        if (llmEnabled() && base.intent !== "fallback") {
            const facts = {
                intent: base.intent,
                cards: base.cards,
            };
            const enhanced = await enhanceReply({
                message,
                history,
                groundedDraft: base.reply,
                facts,
            });
            if (enhanced) {
                base.reply = enhanced;
                base.source = "llm";
            }
        }

        res.status(200).json({ success: true, data: base, error_code: "0" });
    } catch (err) {
        console.error("[chatbot] error:", err);
        res.status(500).json({
            success: false,
            message: "The assistant hit a snag. Please try again.",
            error_code: "1",
        });
    }
};

export const chatHealth = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({
        success: true,
        data: { assistant: ASSISTANT_NAME, llm: llmEnabled() ? "claude" : "rules" },
        error_code: "0",
    });
};
