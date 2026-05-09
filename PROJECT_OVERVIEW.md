# Project Overview

This project is a Next.js 16 App Router application for an AI workspace called **Sigmavalue AI Pilot**.  
It combines:

- a chat assistant
- workflow visualization
- geospatial mapping
- an authenticated dashboard
- an email connector builder

The app is mostly frontend code in this repository. The actual backend is not included here, but the frontend talks to `http://localhost:8000` for authentication, dashboard streaming, and connector APIs.

## 1. Tech Stack

- **Next.js 16.2.2**
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **React Flow** for workflow diagrams
- **Leaflet / react-leaflet** for maps
- **OpenAI SDK** for direct browser-side chat in the main workspace
- **Dagre** for auto-layout of workflow graphs

## 2. Routing Structure

The app uses the Next.js App Router.

- `/` loads the main workspace from [`app/page.tsx`](./app/page.tsx)
- `/login` loads the login screen from [`app/login/page.tsx`](./app/login/page.tsx)
- `/dashboard` loads the authenticated dashboard from [`app/dashboard/page.tsx`](./app/dashboard/page.tsx)

The root layout is in [`app/layout.tsx`](./app/layout.tsx). It sets the fonts, page metadata, and global HTML/body shell.

## 3. High-Level Flow

There are two main user flows.

### A. Main workspace at `/`

This is the "AI pilot" view. It has three panels:

- **Chat**
- **Workflow**
- **Map**

The workspace is built in [`app/page.tsx`](./app/page.tsx) and uses:

- [`components/ChatSection.tsx`](./components/ChatSection.tsx)
- [`components/WorkflowSection.tsx`](./components/WorkflowSection.tsx)
- [`components/MapSection.tsx`](./components/MapSection.tsx)

What happens:

1. The user types a message into the chat.
2. The chat sends the request directly to the OpenAI Responses API from the browser.
3. The assistant response is streamed back.
4. If the response contains a JSON workflow block, the workflow panel renders it.
5. If the response contains coordinates, the map panel shows markers.
6. Marker data is persisted in localStorage.

This workspace is the most "AI-first" part of the app and works without the dashboard backend.

### B. Authenticated dashboard at `/dashboard`

This is the more productized enterprise shell. It requires a token stored in localStorage.

What happens:

1. The dashboard checks for `token` in localStorage.
2. If no token exists, it redirects to `/login`.
3. If a token exists, it loads saved workflow, analytics, panel widths, collapsed state, and markers from localStorage.
4. The dashboard chat talks to the backend streaming endpoint.
5. Workflow state updates live based on stream events.
6. The right panel can show either output or connector configuration depending on the active tab.

Dashboard components:

- [`components/dashboard/chatsectiondashboard.tsx`](./components/dashboard/chatsectiondashboard.tsx)
- [`components/dashboard/workflowsectiondashboard.tsx`](./components/dashboard/workflowsectiondashboard.tsx)
- [`components/dashboard/outputsectiondashboard.tsx`](./components/dashboard/outputsectiondashboard.tsx)
- [`components/dashboard/connectoroutputsection.tsx`](./components/dashboard/connectoroutputsection.tsx)

## 4. Login Flow

The login page is in [`app/login/login.tsx`](./app/login/login.tsx).

Flow:

1. The user enters username and password.
2. The form sends a POST request to `http://localhost:8000/auth/login`.
3. The request body is sent as `application/x-www-form-urlencoded`.
4. If the backend returns `access_token`, the token is saved in localStorage.
5. The user is redirected to `/dashboard`.

So the login page is only a frontend shell; actual authentication lives in the external backend.

## 5. Main Workspace Details

### Chat assistant

[`components/ChatSection.tsx`](./components/ChatSection.tsx) is the browser-side AI assistant.

It uses:

- `OpenAI` browser SDK client
- `gpt-4o-mini`
- `web_search_preview`
- markdown rendering with `react-markdown`
- GitHub-flavored markdown via `remark-gfm`

Behavior:

1. The user sends a message.
2. The assistant streams the response.
3. Workflow requests are detected by keywords like `workflow` or `create a workflow`.
4. The assistant is instructed to return a friendly explanation plus a JSON workflow block.
5. The component extracts that JSON and forwards it to the workflow panel.
6. The chat also scans for coordinate patterns and, if needed, geocodes location names through OpenStreetMap Nominatim.

Important implementation detail:

- The OpenAI API key is read from `NEXT_PUBLIC_OPENAI_API_KEY`.
- `dangerouslyAllowBrowser: true` means this is a client-side call.

### Workflow panel

[`components/WorkflowSection.tsx`](./components/WorkflowSection.tsx) renders the workflow as an interactive React Flow graph.

How it works:

1. It receives workflow JSON with `nodes` and `edges`.
2. The data is normalized so each node has a safe type and display labels.
3. Dagre calculates a clean layout for the graph.
4. React Flow renders the result.
5. Custom node cards show title, status, owner, duration, and icon.
6. The panel supports adding edges interactively.

Workflow node rendering is split into:

- [`components/workflow/CustomNode.tsx`](./components/workflow/CustomNode.tsx)
- [`components/workflow/FlowArrowEdge.tsx`](./components/workflow/FlowArrowEdge.tsx)

### Map panel

[`components/MapSection.tsx`](./components/MapSection.tsx) renders a Leaflet map.

How it works:

1. The assistant extracts coordinates from its response.
2. Those coordinates are stored as markers.
3. Markers are saved to localStorage under `sigmavalue_markers`.
4. The map initializes client-side to avoid SSR issues.
5. Each marker gets a popup with its label, summary, and coordinates.

The map uses dynamic imports so Leaflet only loads in the browser.

## 6. Dashboard Details

The dashboard is more stateful and more backend-driven than the root workspace.

### Chat stream

[`components/dashboard/chatsectiondashboard.tsx`](./components/dashboard/chatsectiondashboard.tsx) sends the user query to:

- `GET http://localhost:8000/crm/generate-stream?query=...`

If the token is present, the component:

1. opens the streaming endpoint
2. reads server-sent events from the response body
3. passes each event to the dashboard page
4. builds a final analytical response from the backend result

If there is no token, it falls back to [`lib/mockAi.ts`](./lib/mockAi.ts).

### Stream event handling

[`app/dashboard/dashboard.tsx`](./app/dashboard/dashboard.tsx) listens for event types such as:

- `stage_start`
- `stage_complete`
- `edge_start`
- `final_result`

These events update:

- the current workflow step label
- workflow node highlighting
- edge animation
- the final output state

That is how the dashboard shows a live "pipeline" feeling while the backend is working.

### Output panel

[`components/dashboard/outputsectiondashboard.tsx`](./components/dashboard/outputsectiondashboard.tsx) shows:

- analytical summary text
- HTML output from the backend
- markers on the map

The HTML is sanitized before rendering so script tags and inline event handlers are removed.

### Connector workspace

[`components/dashboard/connectoroutputsection.tsx`](./components/dashboard/connectoroutputsection.tsx) is a structured email connector builder.

It handles:

- configuration
- testing
- publishing
- live execution
- run history

Backend endpoints used here:

- `POST /connectors/email`
- `PUT /connectors/email/:id/configuration`
- `POST /connectors/email/:id/test`
- `POST /connectors/email/:id/publish`
- `POST /connectors/email/:id/execute`
- `GET /connectors/email/:id/runs`
- `GET /connectors/email/:id/google/oauth/start`

It also generates a workflow preview from the connector prompt and pushes that workflow back into the dashboard when requested.

## 7. Shared State and Persistence

The app uses localStorage for persistence in several places.

Common keys:

- `token` for dashboard auth
- `sigmavalue_markers` for map markers
- `sigmavalue_workflow_data` for workflow JSON
- `sigmavalue_analytical_output` for backend summary output
- `sigmavalue_panel_widths` for panel widths
- `sigmavalue_collapsed_state` for collapsed panel state
- `sigmavalue_chat_history` for dashboard chat history
- `sigmavalue_email_connector_draft` for connector draft state
- `sigmavalue_email_connector_id` for the saved connector ID

This means the UI feels persistent across refreshes without needing a full backend session store for everything.

## 8. Utility Layer

[`lib/types.ts`](./lib/types.ts)

- defines shared message, workflow, and marker types

[`lib/utils.ts`](./lib/utils.ts)

- extracts coordinates from text
- extracts workflow JSON blocks
- computes Dagre layouts
- saves/loads markers from localStorage

[`lib/mockAi.ts`](./lib/mockAi.ts)

- returns canned AI responses when the dashboard has no token or no backend connection

## 9. Important Implementation Notes

- Most of the interactive UI is implemented as **Client Components** using `"use client"`.
- Leaflet and React Flow are loaded client-side where needed.
- The root workspace is a lighter AI demo shell.
- The dashboard is a richer backend-driven shell.
- There is no backend source code in this repository, so the actual server behavior must be inferred from the frontend API calls.

## 10. Current Limitations / Observations

- [`app/page.tsx`](./app/page.tsx) has resize state, but the grid template is currently hard-coded, so the resize logic looks incomplete.
- [`app/page.tsx`](./app/page.tsx) imports `ResizeHandle`, but the page currently uses inline separator bars instead.
- The header theme toggle only toggles a CSS class on the document; it does not appear to drive a full theme system.
- The backend is external, so anything under `http://localhost:8000` must be running separately for login, streaming chat, and connectors to work.

## 11. Simple Summary

In one sentence: this app is an AI command center where chat can generate workflows, detect places on a map, and drive dashboard automation, while the authenticated dashboard adds live backend streaming and connector management.
