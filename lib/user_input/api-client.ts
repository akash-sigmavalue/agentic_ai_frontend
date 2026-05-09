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

export function askQuestionStreamRequest(question: string) {
  return fetch(`${API_BASE_URL}/user-input/ask/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });
}
