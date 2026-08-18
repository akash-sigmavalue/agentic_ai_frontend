import type { TaskState } from "./types";

function normalizeBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/$/, "");
  if (!trimmed) return "http://localhost:8000";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

async function request(baseUrl: string, path: string, init?: RequestInit) {
  const normalized = normalizeBaseUrl(baseUrl);
  try {
    return await fetch(`${normalized}${path}`, init);
  } catch (error) {
    const detail = error instanceof Error && error.message ? ` (${error.message})` : "";
    throw new Error(`Could not reach the agent backend at ${normalized}${detail}`, { cause: error });
  }
}

export async function createAgentTask(
  url: string,
  instruction: string,
  baseUrl: string,
): Promise<{ taskId: string; task: TaskState }> {
  const response = await request(baseUrl, "/api/agent/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, instruction }),
  });
  if (!response.ok) throw new Error((await response.text()) || "Unable to create the agent task");

  const payload = (await response.json()) as TaskState & { task?: TaskState };
  const task = payload.task ?? payload;
  const taskId = task.task_id || task.taskId || payload.task_id || payload.taskId || "";
  if (!taskId) throw new Error("The backend did not return a task ID");
  return { taskId, task };
}

export async function getAgentTask(taskId: string, baseUrl: string) {
  const response = await request(baseUrl, `/api/agent/tasks/${taskId}`);
  if (!response.ok) throw new Error((await response.text()) || "Unable to fetch the task state");
  const payload = (await response.json()) as TaskState & { task?: TaskState };
  return payload.task ?? payload;
}

export async function respondToPrompt(
  taskId: string,
  promptId: string,
  value: unknown,
  baseUrl: string,
) {
  const response = await request(baseUrl, `/api/agent/tasks/${taskId}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ promptId, value }),
  });
  if (!response.ok) throw new Error((await response.text()) || "Unable to submit the response");
}

export function openTaskSocket(
  taskId: string,
  onEvent: (event: Record<string, unknown>) => void,
  baseUrl: string,
) {
  if (typeof window === "undefined" || typeof WebSocket === "undefined") return null;
  const url = new URL(`/api/agent/ws/${taskId}`, normalizeBaseUrl(baseUrl));
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(url);
  socket.onmessage = (event) => {
    try {
      onEvent(JSON.parse(event.data as string) as Record<string, unknown>);
    } catch {
      onEvent({ type: "error", message: "The backend sent an unreadable WebSocket payload." });
    }
  };
  socket.onerror = () => onEvent({ type: "error", message: "The live agent connection failed." });
  return socket;
}
