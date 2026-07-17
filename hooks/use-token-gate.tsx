"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, API_ROUTES } from "@/lib/api-client";

/**
 * All possible token gate states.
 *
 * LOADING       — auth context is still resolving
 * NOT_REQUESTED — user has never requested a token
 * PENDING       — request submitted, awaiting admin approval
 * APPROVED      — approved and tokens are available
 * EXHAUSTED     — approved but available_tokens <= 0
 * REJECTED      — admin rejected the request
 */
export type TokenGateStatus =
  | "LOADING"
  | "NOT_REQUESTED"
  | "PENDING"
  | "APPROVED"
  | "EXHAUSTED"
  | "REJECTED";

export interface UseTokenGateResult {
  /** True for ADMIN users and FREE/PAID users with APPROVED tokens > 0 */
  hasAccess: boolean;
  /** True if the logged-in user is ADMIN */
  isAdmin: boolean;
  /** Current resolved gate status */
  tokenStatus: TokenGateStatus;
  /** Call this to submit a token redemption request */
  requestAccess: () => Promise<void>;
  /** True while the redemption request is in-flight */
  isRequesting: boolean;
  /** Non-null when requestAccess fails */
  error: string | null;
}

/**
 * useTokenGate
 *
 * Reads the current user and their token_balance from useAuth() and
 * derives a clean `tokenStatus` enum plus a `requestAccess()` action.
 *
 * Usage:
 *   const { hasAccess, tokenStatus, requestAccess, isRequesting } = useTokenGate();
 */
export function useTokenGate(): UseTokenGateResult {
  const { user, loading, refreshProfile } = useAuth();
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Derive status ────────────────────────────────────────────────────────────

  const isAdmin = user?.role === "ADMIN";

  let tokenStatus: TokenGateStatus = "LOADING";

  if (!loading && user) {
    if (isAdmin) {
      tokenStatus = "APPROVED"; // admins are always approved
    } else {
      const balance = user.token_balance;

      if (!balance || balance.status === "NOT_REQUESTED") {
        tokenStatus = "NOT_REQUESTED";
      } else if (balance.status === "PENDING") {
        tokenStatus = "PENDING";
      } else if (balance.status === "REJECTED") {
        tokenStatus = "REJECTED";
      } else if (balance.status === "APPROVED") {
        tokenStatus =
          balance.available_tokens > 0 ? "APPROVED" : "EXHAUSTED";
      }
    }
  }

  const hasAccess = tokenStatus === "APPROVED";

  // ── Request access ───────────────────────────────────────────────────────────

  const requestAccess = useCallback(async () => {
    setIsRequesting(true);
    setError(null);

    try {
      const response = await apiRequest(API_ROUTES.requestTokenRedemption, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.detail || "Request failed. Please try again.");
      }

      // Refresh the auth context so UI transitions to PENDING automatically
      await refreshProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
    } finally {
      setIsRequesting(false);
    }
  }, [refreshProfile]);

  return { hasAccess, isAdmin, tokenStatus, requestAccess, isRequesting, error };
}
