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
  // Password reset
  authForgotPassword: '/auth/forgot-password',
  authResetPassword: '/auth/reset-password',
  // Google OAuth for authentication
  authGoogleLogin: '/auth/google/login',
  // Email verification
  authVerifyEmail: '/auth/verify-email',
  authResendVerification: '/auth/resend-verification',
  // Profile (full, includes personal balance + active org)
  profileMe: '/profile/me',
  profileUpdate: '/profile/me',
  profileDelete: '/profile/me',
  // Admin
  adminUsers: '/admin/users',
  adminOrgs: '/admin/orgs',
  adminTransactions: '/admin/transactions',
  adminPromoteEnterprise: (userId: number) => `/admin/users/${userId}/promote-to-enterprise`,
  adminSetOrgBalance: (orgId: number) => `/admin/orgs/${orgId}/set-balance`,
  adminSuspendOrg: (orgId: number) => `/admin/orgs/${orgId}/suspend`,
  adminActivateOrg: (orgId: number) => `/admin/orgs/${orgId}/activate`,
  adminInquiries: '/admin/inquiries',
  adminUpdateInquiryStatus: (inquiryId: number) => `/admin/inquiries/${inquiryId}/status`,
  adminDeleteInquiry: (inquiryId: number) => `/admin/inquiries/${inquiryId}`,
  // Enterprise Org
  enterpriseCreateOrg: '/enterprise/orgs',
  enterpriseMyOrg: '/enterprise/orgs/mine',
  enterpriseRenameOrg: '/enterprise/orgs/mine',
  enterpriseMyOrgMembers: '/enterprise/orgs/mine/members',
  enterpriseMyOrgInvites: '/enterprise/orgs/mine/invites',
  enterpriseSendInvite: '/enterprise/orgs/mine/invites',
  enterpriseRevokeInvite: (inviteId: number) => `/enterprise/orgs/mine/invites/${inviteId}`,
  enterpriseRemoveMember: (userId: number) => `/enterprise/orgs/mine/members/${userId}`,
  enterpriseMyOrgUsage: '/enterprise/orgs/mine/usage',
  enterprisePurchaseTokens: '/enterprise/orgs/mine/purchase-tokens',
  enterpriseInviteAccept: '/enterprise/invites/accept',
  // Payments
  paymentHistory: '/payments/history',
  adminPaymentHistory: '/payments/admin/all',
  // Agent & Generation
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

  const res = await fetch(apiUrl(path), {
    credentials: 'include',
    ...options,
    headers,
  });

  if (res.status === 402) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sigmavalue-tokens-exhausted'));
    }
  }

  return res;
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
