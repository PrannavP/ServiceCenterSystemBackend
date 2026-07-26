
export type IntentName =
    | "greeting"
    | "help"
    | "jobcard_stats"
    | "parts_overview"
    | "low_stock"
    | "part_search"
    | "billing_summary"
    | "knowledge"
    | "smalltalk"
    | "fallback";

export interface Intent {
    name: IntentName;
    arg?: string;
    score: number;
}

const has = (text: string, ...words: string[]): boolean => words.some((w) => text.includes(w));

const GREETINGS = ["hi", "hello", "hey", "yo", "namaste", "good morning", "good afternoon", "good evening", "hlo"];
const THANKS = ["thanks", "thank you", "thx", "cheers", "appreciate"];

function extractPartTerm(text: string): string | undefined {
    const patterns = [
        /(?:do we have|do you have|is there|any|got|find|search(?: for)?|look up|check)\s+(.*?)(?:\s+in stock|\s+available|\?|$)/i,
        /(?:stock|quantity|qty)\s+(?:of|for)\s+(.*?)(?:\?|$)/i,
        /how many\s+(.*?)\s+(?:do we have|are|left|in stock)/i,
    ];
    for (const p of patterns) {
        const m = text.match(p);
        if (m && m[1]) {
            const term = m[1].replace(/[^a-z0-9\s-]/gi, "").trim();
            if (term.length >= 2 && !/^(parts?|stock|items?|things?)$/i.test(term)) return term;
        }
    }
    return undefined;
}

export function detectIntent(rawMessage: string): Intent {
    const text = rawMessage.toLowerCase().trim();

    if (text.length === 0) return { name: "fallback", score: 0 };

    if (has(text, ...THANKS)) return { name: "smalltalk", score: 0.9 };

    if (GREETINGS.some((g) => text === g || text.startsWith(g + " ") || text === g + "!")) {
        return { name: "greeting", score: 0.95 };
    }

    if (has(text, "what can you do", "help", "how do you work", "who are you", "your name", "capabilities", "commands")) {
        return { name: "help", score: 0.9 };
    }

    const isHowTo = has(text, "how do i", "how to", "how can i", "where do i", "where can i", "steps", "guide me", "explain");
    if (isHowTo) {
        return { name: "knowledge", score: 0.8 };
    }

    if (has(text, "revenue", "earned", "income", "sales", "invoice", "bill", "billing", "turnover", "how much")) {
        return { name: "billing_summary", score: 0.85 };
    }

    if (has(text, "low stock", "low-stock", "running low", "restock", "reorder", "out of stock", "needs stock", "running out")) {
        return { name: "low_stock", score: 0.9 };
    }

    if (has(text, "job card", "jobcard", "job-card", "repair order", "work order", "how many card")) {
        return { name: "jobcard_stats", score: 0.85 };
    }

    const partTerm = extractPartTerm(text);
    if (
        partTerm &&
        !/\b(card|job|bill|invoice|revenue)\b/i.test(partTerm) &&
        has(text, "have", "stock", "available", "find", "search", "part", "qty", "quantity", "many")
    ) {
        return { name: "part_search", arg: partTerm, score: 0.8 };
    }

    if (has(text, "parts", "part ", "inventory", "spare", "catalogue", "catalog", "stock")) {
        return { name: "parts_overview", score: 0.75 };
    }

    return { name: "knowledge", score: 0.3 };
}
