# Token Reduction Plan

This document summarizes where token usage is highest in the current codebase and how to reduce it without implementing changes yet.

## What I found

### 1. Frontend homepage chat is token-heavy

File: [`components/ChatSection.tsx`](components/ChatSection.tsx)

Current behavior:
- Sends the full `messages` history on every request.
- Uses streaming with `web_search_preview`.
- Allows a large `max_output_tokens` budget.

Why this costs tokens:
- Every request repeats old conversation context.
- Long assistant replies can grow the prompt size even more on the next turn.

### 2. Dashboard chat relies on the backend pipeline

File: [`components/dashboard/chatsectiondashboard.tsx`](components/dashboard/chatsectiondashboard.tsx)

Current behavior:
- Sends the dashboard query to the backend stream endpoint.
- Does not itself call a model, but it triggers the backend agent pipeline.

Why this costs tokens:
- The real model spend happens in the backend.
- The UI only receives usage data after the fact.

### 3. Backend CRM pipeline uses multiple LLM stages

File: [`D:/connector/backend/AI_Agent_Dynamic_Backend/app/agents/pipeline.py`](D:/connector/backend/AI_Agent_Dynamic_Backend/app/agents/pipeline.py)

Current pipeline stages:
- Planner stage
- SQL resolver stage
- UI agent stage
- Final output stage

Why this costs tokens:
- Each stage is an LLM call.
- The UI agent receives a large context payload, including:
  - user query
  - schema JSON
  - data profile
  - real database JSON

### 4. Connector flow is not the main token sink

Files:
- [`app/connector/page.tsx`](app/connector/page.tsx)
- [`components/connector/chatsectionconnector.tsx`](components/connector/chatsectionconnector.tsx)
- [`components/connector/api.ts`](components/connector/api.ts)

Current behavior:
- Mostly heuristic prompt-to-draft mapping.
- No heavy LLM orchestration in the connector UI itself.

Why this matters:
- This area is important for product flow, but it is not the main token cost driver.

## Best ways to reduce token usage

### Priority 1: Stop sending full chat history

Recommended change:
- In [`components/ChatSection.tsx`](components/ChatSection.tsx), send only:
  - the latest user message
  - a short conversation summary
  - the last few turns if needed

Expected benefit:
- Big reduction in prompt size for repeated conversations.

### Priority 2: Shrink the backend context

Recommended change:
- In [`D:/connector/backend/AI_Agent_Dynamic_Backend/app/agents/pipeline.py`](D:/connector/backend/AI_Agent_Dynamic_Backend/app/agents/pipeline.py), avoid passing the full `real_data_json` unless necessary.
- Pass only:
  - selected rows
  - small previews
  - aggregated values
  - chart-specific slices

Expected benefit:
- Large reduction for dashboard queries with big result sets.

### Priority 3: Reduce the number of LLM calls

Recommended change:
- Collapse or skip stages when possible.
- Example:
  - combine planner and SQL resolver for simple requests
  - skip the UI stage when a simple summary is enough

Expected benefit:
- Fewer model invocations per user query.

### Priority 4: Shorten prompts

Recommended change:
- Remove repeated examples and verbose instructions.
- Keep system prompts concise and structured.

Expected benefit:
- Lower overhead on every request.

### Priority 5: Use smaller models for lightweight tasks

Recommended change:
- Use cheaper/smaller models for:
  - intent detection
  - schema classification
  - query rewriting
- Reserve the stronger model only for final composition.

Expected benefit:
- Lower cost without losing quality for simple steps.

### Priority 6: Cap outputs

Recommended change:
- Set strict output limits for every stage.
- Force JSON-only output where possible.

Expected benefit:
- Prevents rambling outputs and oversized responses.

### Priority 7: Cache repeated work

Recommended change:
- Store recent query results and summaries.
- Reuse them for similar or repeated questions.

Expected benefit:
- Avoids re-paying for the same answer.

## Suggested rollout order

1. Update `components/ChatSection.tsx` to stop sending full history.
2. Reduce the `real_data_json` size in the backend pipeline.
3. Shorten the planner, resolver, and UI prompts.
4. Add a simple summary cache.
5. Split heavy and light model usage by stage.

## What to measure

Track token usage before and after each change for:
- query prompt size
- planner stage
- SQL resolver stage
- UI stage
- final output stage

## Goal

The goal is to keep the user experience the same while reducing:
- total prompt size
- total number of LLM calls
- repeated context overhead

This should lower token usage without changing the product behavior in a visible way.
