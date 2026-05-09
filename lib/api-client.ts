export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const API_ROUTES = {
  authRegister: '/auth/register',
  authLogin: '/auth/login',
  generationQuery: '/generation/query',
  generationUploadData: '/generation/upload-data',
  generationStream: '/generation/stream',
  generationStreamResume: '/generation/stream/resume',
} as const;

export const CONNECTOR_API_ROUTES = {
  processWorkflow: '/v1/process',
  googleOAuthStart: '/oauth/google/start',
  gmailStatus: '/connectors/status/gmail',
  continueMissingField: '/connectors/continue-missing-field',
  gmailTokenTest: '/debug/gmail-token-test',
} as const;

export const apiUrl = (route: string) => `${API_BASE_URL}${route}`;
