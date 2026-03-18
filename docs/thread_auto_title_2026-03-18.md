# Thread Auto-Title Generation

**Date:** 2026-03-18

## Feature Summary

Automatically generates a short, descriptive title for a conversation thread after the first AI response completes, replacing the default "New Conversation" placeholder.

## Trigger Timing

Title generation is triggered **after the first AI response stream ends**, when the conversation history was empty before the request. This provides:
- Maximum context (both user question and AI answer available)
- No impact on streaming performance (runs after `done` event is yielded)
- Single trigger — only fires once per thread (guarded by `not history`)

## Changes

### Backend

**`supabase_storage.py`**
- Added `update_thread_title(thread_id, title)` — UPDATE threads SET title = ?

**`grok/grok.py`**
- Added `_generate_title(user_text, ai_text)` — calls `MODEL_ROUTER` (fast non-reasoning) with a prompt to produce a 5-8 word title; truncated to 80 chars
- `chat_stream()`: after saving messages, if `history` was empty → generate title → update DB → include `title` in `done` SSE event
- `chat()`: same logic for the non-streaming path

### Frontend

**`llm.service.ts`**
- `onDone` callback now accepts optional `title?: string`
- SSE parser passes `event.title` to `onDone`

**`use-threads.ts`**
- Added `updateThreadTitle(threadId, title)` — updates thread title in local state

**`use-chat.ts`**
- Accepts `updateThreadTitle` as a new parameter
- Calls `updateThreadTitle` in the `onDone` handler when `title` is present

**`llm-chat-feature.tsx`**
- Wires `updateThreadTitle` from `useThreads` → `useChat`

## Data Flow

```
chat_stream() stream ends
  → history was empty? → YES (first exchange)
      → _generate_title(user_text, ai_text)   [MODEL_ROUTER, fast]
      → supabase UPDATE threads SET title = ?
      → SSE done event: { ..., title: "Generated Title" }
  → Frontend onDone receives title
      → updateThreadTitle(activeThreadId, title)
      → Thread sidebar re-renders with new title
```

## Error Handling

Title generation failure is non-fatal — logged as a warning, stream completes normally, thread title stays as "New Conversation".
