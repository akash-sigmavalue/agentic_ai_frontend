import { API_BASE_URL, apiRequest } from "@/lib/api-client";

export { API_BASE_URL };

export async function parseApiError(response: Response) {
  try {
    const data = await response.json();
    return data.detail || "Request failed.";
  } catch {
    return "Request failed.";
  }
}

export function uploadDocumentRequest(formData: FormData) {
  return apiRequest("/user-input/documents", {
    method: "POST",
    body: formData,
  });
}

export function askQuestionStreamRequest(question: string) {
  return apiRequest("/user-input/ask/stream", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}
