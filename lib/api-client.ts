export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000'
).replace(/\/$/, '');

export const API_ROUTES = {
  authRegister: '/auth/register',
  authLogin: '/auth/login',
  authLogout: '/auth/logout',
  authMe: '/auth/me',
  generationQuery: '/generation/query',
  generationUploadData: '/generation/upload-data',
  generationStream: '/generation/stream',
  generationStreamResume: '/generation/stream/resume',
} as const;

export const CONNECTOR_API_ROUTES = {
  processWorkflow: '/v1/process',
  streamWorkflow: '/connectors/workflow/run/stream',
  workflowStream: '/connectors/workflow/run/stream',
  googleOAuthStart: '/oauth/google/start',
  gmailStatus: '/connectors/status/gmail',
  continueMissingField: '/connectors/continue-missing-field',
  automationRules: '/connectors/automation-rules',
  gmailTokenTest: '/debug/gmail-token-test',
} as const;

export const apiUrl = (route: string) =>
  `${API_BASE_URL}${route.startsWith('/') ? route : `/${route}`}`;

export async function apiRequest(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  const isFormData = options.body instanceof FormData;

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(apiUrl(path), {
    credentials: 'include',
    ...options,
    headers,
  });
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await apiRequest(path, options);

  if (!response.ok) {
    let message = `API failed with status ${response.status}`;
    try {
      const data = await response.json();
      message = data?.detail || data?.message || message;
    } catch {
      const text = await response.text().catch(() => '');
      message = text || message;
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
