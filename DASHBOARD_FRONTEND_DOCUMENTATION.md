# Dashboard Frontend Documentation

## Scope

This document covers only the frontend implementation of the dashboard experience in `ai_agent_dynamic_frontend`.

It explains:

- how the `/dashboard` page is structured
- how a user query moves through the dashboard UI
- how streamed agent events update the workflow panel
- how agent-generated JSX is rendered in the output panel
- what dashboard state is persisted in `localStorage`

It does not document the connector page or connector-specific workflow implementation.

## Main Entry Points

- Route wrapper: `app/dashboard/page.tsx`
- Dashboard page container: `app/dashboard/dashboard.tsx`
- Chat panel: `components/dashboard/chatsectiondashboard.tsx`
- Workflow panel: `components/dashboard/workflowsectiondashboard.tsx`
- Output panel: `components/dashboard/outputsectiondashboard.tsx`
- Shared types: `lib/types.ts`
- Dashboard helpers: `lib/utils.ts`

## Dashboard Layout Overview

The dashboard page is a three-panel workspace:

1. Chat panel
2. Workflow panel
3. Output panel

These panels are rendered by `app/dashboard/dashboard.tsx` inside a responsive grid. On desktop, the grid uses adjustable panel widths. On smaller screens, it falls back to a single-column layout.

The page also includes:

- a fixed header via `components/Header`
- a left sidebar for dashboard/history/settings navigation
- a fixed footer showing system status and model label

## Route Initialization

`app/dashboard/page.tsx` wraps the dashboard in `Suspense` and renders `DashboardPage`.

`DashboardPage` in `app/dashboard/dashboard.tsx` performs the main client-side setup:

- checks for a `token` in `localStorage`
- redirects to `/login` if no token is present
- restores persisted dashboard state from `localStorage`
- restores saved workflow graph data
- restores saved analytical output
- restores saved panel widths
- restores saved panel collapse state
- restores saved map markers through `loadMarkers()`

The dashboard is guarded by a `mounted` state so it does not render before the client environment is ready.

## High-Level Data Flow

The frontend flow for a dashboard query is:

1. The user types a query in the chat panel.
2. `ChatSectionDashboard` sends the query to the backend streaming endpoint.
3. Streaming events are parsed one by one.
4. Each event is forwarded to `DashboardPage` through `onStreamEvent`.
5. `DashboardPage` updates workflow nodes and edges so the workflow panel reflects progress.
6. When the final result arrives, `ChatSectionDashboard` builds the assistant message and forwards structured output through `onAiResponse`.
7. `DashboardPage` stores the final response text, analytical output, workflow data, and extracted coordinates.
8. `OutputSectionDashboard` renders the analytical summary and, when JSX is present, converts that JSX into a live React component.

## Dashboard State Managed in `dashboard.tsx`

`DashboardPage` owns the shared state that connects all three panels:

- `panelWidths`
  Controls the width ratio of chat, workflow, and output panels.

- `workflowData`
  Holds the node and edge graph shown in the workflow panel.

- `markers`
  Holds geospatial coordinates extracted from responses.

- `analyticalOutput`
  Holds the backend's structured final result. This may contain `jsx`, `html`, `data_summary`, and `insights`.

- `assistantResponse`
  Stores the assistant text used by the output panel when no structured analytical object is available.

- `collapsed`
  Tracks which panels are collapsed.

- `activeTab`
  Tracks the selected sidebar tab.

## Chat Panel Responsibilities

`components/dashboard/chatsectiondashboard.tsx` is responsible for:

- rendering conversation history
- capturing user input
- sending the query
- handling streaming responses
- estimating and displaying token usage
- persisting chat history
- forwarding final results to the parent dashboard

### Query Submission

When the user presses Enter or clicks send:

1. the current input is validated
2. a user message is appended to the local message list
3. the query token estimate is calculated
4. token monitor state is reset for the new run
5. the component tries to call:

`GET http://localhost:8000/crm/generate-stream?query=<encoded query>`

with the `Authorization: Bearer <token>` header when a token exists.

If no token exists, the component falls back to `getAiResponse()` from `lib/mockAi.ts`.

### Streaming Protocol Handling

The chat panel reads the backend response stream through `ReadableStream.getReader()`.

It expects Server-Sent Event style chunks separated by blank lines and prefixed with `data: `.

Each payload is parsed as JSON and may contain fields like:

- `event_type`
- `node`
- `message`
- `data`
- `usage`
- token metrics such as `total_tokens`, `prompt_tokens`, and `completion_tokens`

### Event Forwarding

Every parsed stream event is forwarded to the parent through:

- `onStreamEvent(event)`

This is what lets the workflow panel animate in real time while the query is running.

### Final Result Handling

When `event_type === 'final_result'`:

- the chat panel stores `event.data` as `analyticalData`
- it derives a readable assistant message from `data_summary`, `jsx`, or the raw object
- it appends any `insights` into markdown text
- it appends a final assistant message to the chat history
- it calls:

`onAiResponse(aiResponseContent, analyticalData)`

This call is the bridge between the streamed backend result and the dashboard's shared output state.

### Token Monitor

The chat panel also maintains a token usage monitor for the latest run.

It separates:

- query token estimate
- per-agent metrics
- total run token count

Agent metrics are extracted from `stage_complete` and `final_result` events. If exact usage is missing, the UI falls back to estimated token counts derived from message length.

## Workflow Panel Responsibilities

`components/dashboard/workflowsectiondashboard.tsx` is a visualization layer for workflow progress.

It does not fetch data itself. It only renders the `workflowData` received from `DashboardPage`.

### Workflow Event Mapping

`DashboardPage` translates backend event names into graph node and edge activity in `handleStreamEvent()`.

The stage labels currently map like this:

- `query` -> `Query`
- `intent_agent` -> `Intent Agent`
- `planning_agent` -> `Planning`
- `database` -> `Database`
- `ui_agent` -> `UI Agent`
- `output` -> `Output`

The graph node ids currently map like this:

- `query` -> `query`
- `intent_agent` -> `agent1`
- `planning_agent` -> `agent2`
- `database` -> `database`
- `ui_agent` -> `agent3`
- `output` -> `output`

### Graph Construction

If no workflow graph exists yet, `handleStreamEvent()` creates a base graph with:

- Query Received
- Agent 1: UI Planner
- Agent 2: SQL Resolver
- Database Execution
- Agent 3: UI Generator
- Final Output

As stream events arrive:

- `stage_start` highlights the active node
- `stage_complete` marks the node done
- `edge_start` animates the active edge
- `final_result` marks the output stage complete

### Layout Rendering

`WorkflowSectionDashboard` passes nodes and edges into `getLayoutedElements()` from `lib/utils.ts`.

That helper uses `dagre` to automatically assign node positions before rendering them in `ReactFlow`.

The workflow panel uses:

- `ReactFlow` for graph rendering
- `CustomNode` for node styling
- `MarkerType.ArrowClosed` for directional edges

If there is no workflow data yet, the panel shows an idle "Logic Canvas Ready" placeholder state.

## Output Panel Responsibilities

`components/dashboard/outputsectiondashboard.tsx` is the part of the dashboard that turns backend output into visible analytical UI.

This is the key dashboard component for agent-generated UI rendering.

It is responsible for:

- showing analytical summaries
- rendering generated JSX as a live component
- displaying response markdown when no structured object exists
- showing map markers when coordinates are available
- supporting fullscreen output mode

## How Agent-Generated UI Is Rendered

The backend can return structured output in `analyticalOutput`. The frontend expects fields such as:

- `data_summary`
- `jsx`
- `html`
- `insights`

The important field for live UI rendering is `jsx`.

### Rendering Pipeline

When `analyticalOutput.jsx` is present:

1. `OutputSectionDashboard` loads `@babel/standalone` on the client.
2. The JSX string is cleaned to remove import statements.
3. The component name is extracted from an `export default` declaration.
4. Babel transforms the JSX into executable JavaScript using the `react` preset.
5. A runtime factory is created with `new Function(...)`.
6. React and the supported Recharts components are injected into that factory.
7. The generated function returns a React component.
8. That component is stored in `RenderedComponent` state.
9. The output panel renders `<RenderedComponent />`.

### JSX Format Expected by the Frontend

The current renderer expects the generated JSX to export a default component, for example:

```jsx
export default function GeneratedPanel() {
  return <div>Hello</div>;
}
```

or a default-exported const component.

If the JSX does not match that pattern, `createComponentFromJsx()` returns `null`, and the panel shows an error message instead of crashing the page.

### Supported Runtime Components

The generated JSX currently has access to:

- `React`
- `BarChart`
- `Bar`
- `LineChart`
- `Line`
- `PieChart`
- `Pie`
- `Cell`
- `CartesianGrid`
- `XAxis`
- `YAxis`
- `Tooltip`
- `Legend`
- `ResponsiveContainer`
- `ScatterChart`
- `Scatter`

This means agent-generated JSX can render React UI plus a defined subset of Recharts charting components without importing them manually.

### Failure Mode

If JSX compilation or component creation fails:

- the UI shows a warning card
- the error reason is displayed
- the first 500 characters of generated JSX can be expanded for debugging

This makes rendering failures visible in the output panel instead of silently failing.

## Analytical Summary Rendering

If `analyticalOutput.data_summary` exists, the output panel renders it in a styled summary block above the generated component.

If `responseText` exists but `analyticalOutput` does not, the output panel renders the response as markdown using:

- `react-markdown`
- `remark-gfm`

## Marker Extraction and Map Behavior

Although this document is dashboard-focused, marker handling is part of the dashboard output state.

`DashboardPage.handleAiResponse()` calls `extractCoordinates()` from `lib/utils.ts` to scan response text for coordinates.

Supported coordinate patterns include:

- `latitude: 18.5597, longitude: 73.7799`
- `(18.5597, 73.7799)`
- `18.5597, 73.7799`

New markers are deduplicated and persisted through `saveMarkers()`.

`OutputSectionDashboard` renders those markers with:

- `react-leaflet`
- `leaflet`
- dynamic imports with `ssr: false`

The map uses the first marker as its initial center.

If no markers exist, the panel shows a dashboard placeholder state instead.

## Dashboard Persistence

The dashboard stores several pieces of frontend state in `localStorage`.

### Keys Used

- `token`
  Used for dashboard access and authenticated streaming calls.

- `sigmavalue_chat_history`
  Persists dashboard chat messages.

- `sigmavalue_workflow_data`
  Persists the most recent workflow graph.

- `sigmavalue_analytical_output`
  Persists the latest structured analytical output.

- `sigmavalue_panel_widths`
  Persists resized panel ratios.

- `sigmavalue_collapsed_state`
  Persists panel collapse state.

- `sigmavalue_markers`
  Persists extracted marker data.

## Interaction Details

### Panel Resizing

`DashboardPage` tracks drag state with `isDragging`.

Dragging the separator between panels updates `panelWidths`, and the final values are persisted on mouse up.

### Panel Collapse

The chat and workflow panels support collapse toggles through the shared `collapsed` state.

### Fullscreen Output

The output panel can switch into fullscreen mode when analytical output exists.

While fullscreen is active:

- document body scrolling is disabled
- pressing `Escape` exits fullscreen

## Shared Types Relevant to the Dashboard

From `lib/types.ts`:

- `Message`
  Chat message shape used by the dashboard chat panel.

- `WorkflowNode`
  Node structure used by the workflow graph.

- `WorkflowEdge`
  Edge structure used by the workflow graph.

- `WorkflowData`
  Wrapper holding graph nodes and edges.

- `MarkerData`
  Marker structure used by the output map.

## Current Frontend Assumptions

The dashboard frontend currently assumes:

- the backend stream emits JSON events in SSE-style `data: ...` blocks
- `final_result` includes a structured object that may contain `jsx`
- generated JSX is safe to compile in the browser
- generated JSX exports a default component
- chart components used by generated JSX are limited to the injected Recharts set
- the backend is reachable at `http://localhost:8000`

## Risks and Implementation Notes

These are important for anyone extending the dashboard:

- The generated JSX renderer uses `new Function(...)`, which is powerful but risky if untrusted code reaches the frontend.
- Import statements are stripped from generated JSX, so the generated component must rely only on injected globals and standard React features.
- `extractWorkflow()` only parses fenced JSON blocks in markdown. It is separate from the streamed stage graph logic.
- The dashboard can still show useful output even if workflow JSON is absent, because stage events alone are enough to animate the workflow panel.
- The map and dynamic JSX renderer are client-only behaviors and intentionally avoid server-side rendering.

## Dashboard-Specific Dependency Notes

Key dependencies used by this dashboard flow:

- `reactflow` for workflow visualization
- `dagre` for graph layout
- `react-markdown` and `remark-gfm` for assistant/output markdown
- `react-leaflet` and `leaflet` for marker visualization
- `@babel/standalone` for runtime JSX compilation
- `recharts` for chart components inside generated UI
- `lucide-react` for panel and status icons

## Suggested Reading Order for New Developers

If someone wants to understand the dashboard frontend quickly, read files in this order:

1. `app/dashboard/dashboard.tsx`
2. `components/dashboard/chatsectiondashboard.tsx`
3. `components/dashboard/outputsectiondashboard.tsx`
4. `components/dashboard/workflowsectiondashboard.tsx`
5. `lib/utils.ts`
6. `lib/types.ts`

## Summary

The dashboard frontend is a coordinated three-panel interface where:

- the chat panel sends the user query and consumes streamed backend events
- the workflow panel visualizes agent execution progress in real time
- the output panel renders both analytical summaries and agent-generated JSX as live React UI

The most important dashboard-specific rendering path is:

user query -> streaming backend events -> final structured analytical output -> runtime JSX compilation -> rendered dashboard UI

That path is implemented entirely through the interaction between:

- `ChatSectionDashboard`
- `DashboardPage`
- `OutputSectionDashboard`
