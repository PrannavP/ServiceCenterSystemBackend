
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
    stats?: StatCardItem[];
    rows?: Array<Record<string, string | number>>;
    text?: string;
}

export interface ChatAction {
    label: string;
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

export interface ToolResult {
    summary: string;
    cards: ChatCard[];
    actions: ChatAction[];
    suggestions: string[];
    facts: Record<string, unknown>;
}
