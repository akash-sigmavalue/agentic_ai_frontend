export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

export async function parseApiError(response: Response) {
  try {
    const data = await response.json();
    return data.detail || "Request failed.";
  } catch {
    return "Request failed.";
  }
}

export function uploadDocumentRequest(formData: FormData) {
  return fetch(`${API_BASE_URL}/user-input/documents`, {
    method: "POST",
    body: formData,
  });
}

export function askQuestionStreamRequest(question: string, session_id?: string) {
  return fetch(`${API_BASE_URL}/user-input/ask/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question, session_id }),
  });
}

export function highlightRectsRequest(document_id: string, page_number: number, chunk_text: string) {
  return fetch(`${API_BASE_URL}/user-input/pdf/highlight-rects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ document_id, page_number, chunk_text }),
  });
}
