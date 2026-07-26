// Types for the Service Center AI Assistant ("Aria")

export interface ChatTurn {
    role: "user" | "assistant";
    content: string;
}

export interface ChatRequest {
    message: string;
    history?: ChatTurn[];
}

export type CardType = "stat" | "list" | "part" | "bill" | "info";

export interface StatCardItem {
    label: string;
    value: string | number;
    hint?: string;
}

export interface ChatCard {
    type: CardType;
    title?: string;
    // For "stat" cards
    stats?: StatCardItem[];
    // For "list" / "part" / "bill" cards
    rows?: Array<Record<string, string | number>>;
    // For "info" cards
    text?: string;
}

export interface ChatAction {
    label: string;
    // Frontend route path (react-router) the button navigates to
    path: string;
}

export interface ChatReply {
    reply: string;
    cards: ChatCard[];
    actions: ChatAction[];
    suggestions: string[];
    intent: string;
    source: "llm" | "rules";
}

// Result returned by a retrieval tool: human-facing text + machine-facing grounding data
export interface ToolResult {
    // Short natural-language summary the template responder can use directly
    summary: string;
    cards: ChatCard[];
    actions: ChatAction[];
    suggestions: string[];
    // Compact facts passed to the LLM so it can phrase a grounded answer
    facts: Record<string, unknown>;
}
