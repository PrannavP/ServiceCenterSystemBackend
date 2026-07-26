# Aria — Service Center AI Assistant

A domain-aware, in-app assistant for the ServiceCenter Suite. It answers live
questions about **job cards**, **parts inventory** and **billing**, plus
how-to / navigation help — and it does so **grounded in the database**, so the
numbers it reports are always real.

## How it works

```
message ─▶ intent engine ─▶ ┌─ DB tools (jobcards / parts / billing)
                            └─ knowledge base (how-to / navigation)
                                     │
                                     ▼
                        grounded draft reply + data cards + actions
                                     │
                     (optional) Claude/Gemini refines the wording, grounded
                                on the same facts → natural language
                                     │
                                     ▼
                                JSON response
```

- **Fully functional with no external API.** The intent engine + DB tools +
  knowledge base always produce a correct answer.
- **Optional LLM polish.** If `ANTHROPIC_API_KEY` is set, Claude rephrases the
  grounded draft into warmer natural language. It is instructed to use *only*
  the retrieved facts, so it cannot invent numbers. If the call fails or times
  out, it silently falls back to the template reply.

## Files

| File | Purpose |
|------|---------|
| `intent.ts` | Maps a message to an intent (+ optional argument). |
| `tools.ts` | DB retrieval: job-card stats, parts overview, low stock, part search, billing summary. |
| `knowledgeBase.ts` | System overview + how-to / navigation entries. |
| `llmProvider.ts` | Optional Claude enhancement (grounded, graceful fallback). |
| `../../controllers/app/chatbot.controller.ts` | Orchestrates the above. |
| `../../routes/app/chatbot.routes.ts` | `POST /api/chatbot/chat`, `GET /api/chatbot/health`. |

## API

`POST /api/chatbot/chat`

```json
{ "message": "how many job cards do we have?", "history": [] }
```

Response `data`:

```json
{
  "reply": "There are 12 job cards in total — 9 active, and 2 created today.",
  "cards": [{ "type": "stat", "title": "Job Cards", "stats": [ ... ] }],
  "actions": [{ "label": "View job cards", "path": "/app/jobcard" }],
  "suggestions": ["Create a job card", "Show low stock parts"],
  "intent": "jobcard_stats",
  "source": "rules"
}
```

Try: *"how many job cards"*, *"show low stock parts"*, *"do we have oil filter?"*,
*"what's our revenue this month?"*, *"how do I create a job card?"*.

## Configuration (optional)

Add to `ServiceCenterSystemBackend/.env` to enable natural-language phrasing:

```
ANTHROPIC_API_KEY=sk-ant-...      # enables Claude enhancement
CHATBOT_MODEL=claude-sonnet-5     # optional, this is the default
```

Check the active mode any time: `GET /api/chatbot/health` →
`{ "assistant": "Aria", "llm": "claude" | "rules" }`.

## Frontend

The floating widget lives in
`ServiceCenterSystemFrontend/src/components/Chatbot/ChatWidget.jsx` and is
mounted in `BaseLayout`, so it appears on every authenticated page. It renders
the assistant's data cards, navigation buttons and suggestion chips, and
persists recent history in `localStorage`.
