// Optional LLM enhancement layer.
//
// When ANTHROPIC_API_KEY is set the assistant phrases its answer with Claude,
// GROUNDED strictly on the facts we retrieved from the database (so it can
// never invent numbers). With no key, this returns null and the caller falls
// back to the deterministic template responder — the assistant stays fully
// functional either way.

import type { ChatTurn } from "../../interfaces/app/chatbot/chatbot.interface.js";
import { ASSISTANT_NAME, SYSTEM_OVERVIEW } from "./knowledgeBase.js";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-5";

export function llmEnabled(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
}

interface EnhanceParams {
    message: string;
    history: ChatTurn[];
    // A correct, DB-grounded draft answer the model should refine (not contradict).
    groundedDraft: string;
    facts: Record<string, unknown>;
}

export async function enhanceReply(params: EnhanceParams): Promise<string | null> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;

    const model = process.env.CHATBOT_MODEL || DEFAULT_MODEL;

    const systemPrompt = [
        `You are ${ASSISTANT_NAME}, the friendly in-app assistant for a vehicle service-center management system.`,
        SYSTEM_OVERVIEW,
        "",
        "Rules:",
        "- Answer in 1-3 short sentences, warm and professional.",
        "- You may ONLY state facts contained in GROUNDED FACTS or the draft answer. Never invent numbers, names, or totals.",
        "- If the facts don't cover the question, gently say so and suggest what you can help with.",
        "- Do not use markdown headings or bullet lists; plain sentences only. Currency is Nepalese Rupees (Rs.).",
    ].join("\n");

    const userContent = [
        `User message: ${params.message}`,
        "",
        `GROUNDED FACTS (JSON): ${JSON.stringify(params.facts)}`,
        "",
        `Correct draft answer to refine: ${params.groundedDraft}`,
    ].join("\n");

    // Keep a little conversational context.
    const historyMsgs = params.history.slice(-4).map((t) => ({
        role: t.role,
        content: t.content,
    }));

    const body = {
        model,
        max_tokens: 400,
        system: systemPrompt,
        messages: [...historyMsgs, { role: "user", content: userContent }],
    };

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        const res = await fetch(ANTHROPIC_URL, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
            console.warn(`[chatbot] LLM call failed: ${res.status}`);
            return null;
        }

        const data: any = await res.json();
        const text = Array.isArray(data?.content)
            ? data.content.filter((c: any) => c?.type === "text").map((c: any) => c.text).join("").trim()
            : "";

        return text.length > 0 ? text : null;
    } catch (err) {
        console.warn("[chatbot] LLM enhancement skipped:", (err as Error).message);
        return null;
    }
}
