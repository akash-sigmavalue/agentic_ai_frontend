"use client";

/**
 * WalletGate — replaces the old TokenAccessGate
 *
 * New pricing model:
 *   - All users get 10,000 free tokens on signup (automatic, no approval)
 *   - When personal_token_balance = 0 and no active org → show pricing page
 *   - Enterprise org members use org wallet
 *   - ADMIN users always pass through
 *
 * Zero manual approval. Zero admin redemption requests.
 */

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Loader2, Zap, Building2, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface WalletGateProps {
  children: React.ReactNode;
  featureName?: string;
}

export default function WalletGate({
  children,
  featureName = "Valuation Agent",
}: WalletGateProps) {
  const { user, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [tokensExhaustedTriggered, setTokensExhaustedTriggered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handleExhausted = () => {
      setTokensExhaustedTriggered(true);
      setVisible(true);
      if (refreshProfile) {
        refreshProfile();
      }
    };
    window.addEventListener('sigmavalue-tokens-exhausted', handleExhausted);
    return () => window.removeEventListener('sigmavalue-tokens-exhausted', handleExhausted);
  }, [refreshProfile]);

  // Still loading auth
  if (loading) {
    return (
      <div className="wg-overlay wg-overlay--in">
        <div className="wg-card">
          <Loader2 className="wg-spin" style={{ width: 32, height: 32 }} />
          <p className="wg-body">Checking access…</p>
        </div>
        <WalletGateStyles />
      </div>
    );
  }

  // Unauthenticated users can view the interface (prompt submit handles login redirect)
  if (!user) return <>{children}</>;

  // ADMIN always passes through
  if (user.role === "ADMIN") return <>{children}</>;

  if (!tokensExhaustedTriggered) {
    // Enterprise org member with active org → passes through (uses org wallet)
    const hasActiveOrg =
      user.active_org &&
      user.active_org.org_status === "ACTIVE" &&
      (user.active_org.org_token_balance ?? 0) > 0;

    if (hasActiveOrg) return <>{children}</>;

    // Personal wallet check
    const personalBalance = user.personal_token_balance ?? 0;
    if (personalBalance > 0) return <>{children}</>;
  }

  // No tokens anywhere — show upgrade prompt
  const orgSuspended =
    user.active_org && user.active_org.org_status === "SUSPENDED";
  const orgExhausted =
    user.active_org &&
    user.active_org.org_status === "ACTIVE" &&
    (user.active_org.org_token_balance ?? 0) <= 0;

  let heading = "Your Free Credits Are Used Up";
  let body =
    "You've used your 10,000 free tokens. Purchase a token pack to keep going, or talk to us about an Enterprise plan.";

  if (orgSuspended) {
    heading = "Organization Suspended";
    body =
      "Your organization has been suspended. Contact your administrator or our support team.";
  } else if (orgExhausted) {
    heading = "Organization Tokens Exhausted";
    body =
      "Your organization's shared token pool is empty. Your Owner needs to purchase more tokens.";
  }

  const personalBalance = user.personal_token_balance ?? 0;

  return (
    <div className={`wg-overlay ${visible ? "wg-overlay--in" : ""}`}>
      <div className="wg-card">
        <div className="wg-glow" />

        <div className="wg-icon-wrap">
          {orgSuspended || orgExhausted ? (
            <Building2 style={{ width: 26, height: 26 }} />
          ) : (
            <Coins style={{ width: 26, height: 26 }} />
          )}
        </div>

        <h3 className="wg-heading">{heading}</h3>
        <p className="wg-body">{body}</p>

        {!orgSuspended && !orgExhausted && (
          <div className="wg-actions">
            <button
              id="wallet-gate-buy-tokens"
              className="wg-cta wg-cta--primary"
              onClick={() => router.push("/pricing")}
            >
              <Zap style={{ width: 15, height: 15 }} />
              View Pricing Plans
            </button>
            <button
              className="wg-cta wg-cta--secondary"
              onClick={() => router.push("/pricing#enterprise-contact")}
            >
              Contact Us
              <ArrowRight style={{ width: 13, height: 13 }} />
            </button>
          </div>
        )}

        <p className="wg-footnote">
          You still have{" "}
          <strong className="wg-token-count">
            {(personalBalance).toLocaleString()} tokens
          </strong>{" "}
          remaining in your personal wallet.
        </p>
      </div>
      <WalletGateStyles />
    </div>
  );
}

function WalletGateStyles() {
  return (
    <style>{`
      /* Light Mode (default) */
      .wg-overlay {
        position: absolute;
        inset: 0;
        z-index: 50;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: linear-gradient(
          160deg,
          rgba(248, 250, 252, 0.92) 0%,
          rgba(241, 245, 249, 0.95) 60%,
          rgba(226, 232, 240, 0.92) 100%
        );
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        border-radius: inherit;
        opacity: 0;
        transform: scale(0.97);
        transition: opacity 0.35s ease, transform 0.35s ease;
      }
      .wg-overlay--in { opacity: 1; transform: scale(1); }

      .wg-card {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        max-width: 360px;
        width: 100%;
        text-align: center;
        padding: 36px 32px;
        background: #ffffff;
        border: 1px solid rgba(99, 102, 241, 0.2);
        border-radius: 20px;
        box-shadow: 0 20px 40px -15px rgba(99, 102, 241, 0.12), 0 10px 25px -5px rgba(0, 0, 0, 0.08);
        overflow: hidden;
      }

      .wg-glow {
        position: absolute;
        top: -60px;
        left: 50%;
        transform: translateX(-50%);
        width: 240px;
        height: 240px;
        background: radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%);
        pointer-events: none;
      }

      .wg-icon-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 58px;
        height: 58px;
        border-radius: 16px;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.08));
        border: 1px solid rgba(99, 102, 241, 0.25);
        color: #4f46e5;
      }

      .wg-heading {
        font-size: 17px;
        font-weight: 800;
        color: #0f172a;
        margin: 0;
        letter-spacing: -0.01em;
        line-height: 1.3;
      }

      .wg-body {
        font-size: 13px;
        color: #475569;
        line-height: 1.65;
        margin: 0;
      }

      .wg-footnote {
        font-size: 11px;
        color: #64748b;
        margin: 4px 0 0;
      }

      .wg-token-count {
        color: #4f46e5;
        font-weight: 700;
      }

      .wg-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
        margin-top: 4px;
      }

      .wg-cta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 11px 22px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
        border: none;
        width: 100%;
        letter-spacing: 0.01em;
      }

      .wg-cta--primary {
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        color: #fff;
        box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
      }
      .wg-cta--primary:hover { opacity: 0.9; transform: translateY(-2px); box-shadow: 0 6px 24px rgba(99, 102, 241, 0.45); }

      .wg-cta--secondary {
        background: rgba(99, 102, 241, 0.06);
        color: #4f46e5;
        border: 1px solid rgba(99, 102, 241, 0.25);
      }
      .wg-cta--secondary:hover { background: rgba(99, 102, 241, 0.12); transform: translateY(-1px); }

      .wg-spin {
        animation: wg-spin 1s linear infinite;
        color: #4f46e5;
      }
      @keyframes wg-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      /* Dark Mode Overrides */
      .dark-mode .wg-overlay,
      html.dark-mode .wg-overlay,
      .dark .wg-overlay,
      html.dark .wg-overlay {
        background: linear-gradient(
          160deg,
          rgba(2, 6, 23, 0.93) 0%,
          rgba(15, 23, 42, 0.96) 60%,
          rgba(30, 41, 59, 0.91) 100%
        );
      }

      .dark-mode .wg-card,
      html.dark-mode .wg-card,
      .dark .wg-card,
      html.dark .wg-card {
        background: linear-gradient(145deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9));
        border: 1px solid rgba(99, 102, 241, 0.22);
        box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.08), 0 24px 60px rgba(0, 0, 0, 0.5);
      }

      .dark-mode .wg-glow,
      html.dark-mode .wg-glow,
      .dark .wg-glow,
      html.dark .wg-glow {
        background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
      }

      .dark-mode .wg-icon-wrap,
      html.dark-mode .wg-icon-wrap,
      .dark .wg-icon-wrap,
      html.dark .wg-icon-wrap {
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(139, 92, 246, 0.18));
        border: 1px solid rgba(99, 102, 241, 0.32);
        color: #818cf8;
      }

      .dark-mode .wg-heading,
      html.dark-mode .wg-heading,
      .dark .wg-heading,
      html.dark .wg-heading {
        color: #f1f5f9;
      }

      .dark-mode .wg-body,
      html.dark-mode .wg-body,
      .dark .wg-body,
      html.dark .wg-body {
        color: #94a3b8;
      }

      .dark-mode .wg-footnote,
      html.dark-mode .wg-footnote,
      .dark .wg-footnote,
      html.dark .wg-footnote {
        color: #64748b;
      }

      .dark-mode .wg-token-count,
      html.dark-mode .wg-token-count,
      .dark .wg-token-count,
      html.dark .wg-token-count {
        color: #c7d2fe;
      }

      .dark-mode .wg-cta--secondary,
      html.dark-mode .wg-cta--secondary,
      .dark .wg-cta--secondary,
      html.dark .wg-cta--secondary {
        background: rgba(99, 102, 241, 0.08);
        color: #a5b4fc;
        border: 1px solid rgba(99, 102, 241, 0.2);
      }
      .dark-mode .wg-cta--secondary:hover,
      html.dark-mode .wg-cta--secondary:hover,
      .dark .wg-cta--secondary:hover,
      html.dark .wg-cta--secondary:hover {
        background: rgba(99, 102, 241, 0.14);
      }

      .dark-mode .wg-spin,
      html.dark-mode .wg-spin,
      .dark .wg-spin,
      html.dark .wg-spin {
        color: #818cf8;
      }
    `}</style>
  );
}
