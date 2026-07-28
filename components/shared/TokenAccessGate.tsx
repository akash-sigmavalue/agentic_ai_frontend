"use client";

import React, { useEffect, useState } from "react";
import {
  KeyRound,
  Clock,
  XCircle,
  Coins,
  Loader2,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useTokenGate, TokenGateStatus } from "@/hooks/use-token-gate";

interface TokenAccessGateProps {
  /** The protected content (chat section, etc.) */
  children: React.ReactNode;
  /** Display name of the feature — used in messaging */
  featureName?: string;
}

// ── Per-state config ─────────────────────────────────────────────────────────

interface StateConfig {
  icon: React.ReactNode;
  iconClass: string;
  badgeLabel: string;
  badgeClass: string;
  heading: string;
  body: React.ReactNode;
  showCta: boolean;
  ctaLabel?: string;
}

function getStateConfig(
  status: TokenGateStatus,
  featureName: string,
  error: string | null
): StateConfig {
  switch (status) {
    case "NOT_REQUESTED":
      return {
        icon: <KeyRound />,
        iconClass: "tag--indigo",
        badgeLabel: "Access Required",
        badgeClass: "badge--indigo",
        heading: "Activate Your Free Trial",
        body: (
          <>
            To use the <strong>{featureName}</strong>, you need to request free
            token access. Once approved by an admin, you&apos;ll receive{" "}
            <strong>1,000,000 tokens</strong> at no cost.
            {error && (
              <span className="tg-error">
                <AlertTriangle /> {error}
              </span>
            )}
          </>
        ),
        showCta: true,
        ctaLabel: "Request Free Access",
      };

    case "PENDING":
      return {
        icon: <Clock />,
        iconClass: "tag--amber",
        badgeLabel: "Under Review",
        badgeClass: "badge--amber",
        heading: "Request Under Review",
        body: (
          <>
            Your token access request has been submitted and is{" "}
            <strong>awaiting admin approval</strong>. You&apos;ll be notified
            once it&apos;s approved. This usually takes less than 24 hours.
          </>
        ),
        showCta: false,
      };

    case "REJECTED":
      return {
        icon: <XCircle />,
        iconClass: "tag--red",
        badgeLabel: "Request Rejected",
        badgeClass: "badge--red",
        heading: "Access Request Rejected",
        body: (
          <>
            Your previous token request was rejected by an admin. You can
            submit a new request or contact{" "}
            <strong>support@sigmavalue.in</strong> for assistance.
            {error && (
              <span className="tg-error">
                <AlertTriangle /> {error}
              </span>
            )}
          </>
        ),
        showCta: true,
        ctaLabel: "Re-request Access",
      };

    case "EXHAUSTED":
      return {
        icon: <Coins />,
        iconClass: "tag--orange",
        badgeLabel: "Tokens Exhausted",
        badgeClass: "badge--orange",
        heading: "Free Trial Tokens Exhausted",
        body: (
          <>
            You have used all <strong>1,000,000 free tokens</strong>. Please
            contact <strong>support@sigmavalue.in</strong> to discuss upgrading
            your plan or receiving additional tokens.
          </>
        ),
        showCta: false,
      };

    case "LOADING":
    default:
      return {
        icon: <Loader2 className="tg-spin" />,
        iconClass: "tag--slate",
        badgeLabel: "Loading",
        badgeClass: "badge--slate",
        heading: "Checking Access",
        body: <>Verifying your token balance&hellip;</>,
        showCta: false,
      };
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TokenAccessGate({
  children,
  featureName = "Valuation Agent",
}: TokenAccessGateProps) {
  const { hasAccess, isAdmin, tokenStatus, requestAccess, isRequesting, error } =
    useTokenGate();

  // Entrance animation — fade in after first render
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Admins and approved users: render children
  if (isAdmin || hasAccess) return <>{children}</>;

  const cfg = getStateConfig(tokenStatus, featureName, error);

  return (
    <div className={`tg-overlay ${visible ? "tg-overlay--in" : ""}`}>
      <div className="tg-card">
        {/* Glow blob */}
        <div className="tg-glow" />

        {/* Badge */}
        <span className={`tg-badge ${cfg.badgeClass}`}>{cfg.badgeLabel}</span>

        {/* Icon */}
        <div className={`tg-icon-wrap ${cfg.iconClass}`}>{cfg.icon}</div>

        {/* Text */}
        <h3 className="tg-heading">{cfg.heading}</h3>
        <p className="tg-body">{cfg.body}</p>

        {/* CTA */}
        {cfg.showCta && (
          <button
            id={`token-gate-cta-${featureName.replace(/\s+/g, "-").toLowerCase()}`}
            className="tg-cta"
            onClick={requestAccess}
            disabled={isRequesting}
          >
            {isRequesting ? (
              <>
                <Loader2 className="tg-spin" />
                Submitting&hellip;
              </>
            ) : (
              <>
                <ShieldCheck />
                {cfg.ctaLabel}
              </>
            )}
          </button>
        )}

        {/* Pending pulse dots */}
        {tokenStatus === "PENDING" && (
          <div className="tg-pulse-row">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="tg-pulse-dot"
                style={{ animationDelay: `${i * 0.25}s` }}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        /* ── Overlay ────────────────────────────────────────────── */
        .tg-overlay {
          position: absolute;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: linear-gradient(
            160deg,
            rgba(2, 6, 23, 0.92) 0%,
            rgba(15, 23, 42, 0.95) 60%,
            rgba(30, 41, 59, 0.9) 100%
          );
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-radius: inherit;
          opacity: 0;
          transform: scale(0.97);
          transition: opacity 0.35s ease, transform 0.35s ease;
        }

        .tg-overlay--in {
          opacity: 1;
          transform: scale(1);
        }

        /* ── Card ───────────────────────────────────────────────── */
        .tg-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          max-width: 340px;
          width: 100%;
          text-align: center;
          padding: 32px 28px;
          background: linear-gradient(
            145deg,
            rgba(30, 41, 59, 0.8),
            rgba(15, 23, 42, 0.9)
          );
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 20px;
          box-shadow:
            0 0 0 1px rgba(99,102,241,0.08),
            0 24px 60px rgba(0,0,0,0.5);
          overflow: hidden;
        }

        /* Decorative glow behind the card */
        .tg-glow {
          position: absolute;
          top: -60px;
          left: 50%;
          transform: translateX(-50%);
          width: 220px;
          height: 220px;
          background: radial-gradient(
            circle,
            rgba(99, 102, 241, 0.18) 0%,
            transparent 70%
          );
          pointer-events: none;
        }

        /* ── Badge ──────────────────────────────────────────────── */
        .tg-badge {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
        }

        .badge--indigo { background: rgba(99,102,241,0.18); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.3); }
        .badge--amber  { background: rgba(245,158,11,0.18); color: #fcd34d; border: 1px solid rgba(245,158,11,0.3); }
        .badge--red    { background: rgba(239,68,68,0.15);  color: #fca5a5; border: 1px solid rgba(239,68,68,0.3);  }
        .badge--orange { background: rgba(249,115,22,0.15); color: #fdba74; border: 1px solid rgba(249,115,22,0.3); }
        .badge--slate  { background: rgba(100,116,139,0.15);color: #94a3b8; border: 1px solid rgba(100,116,139,0.3);}

        /* ── Icon ───────────────────────────────────────────────── */
        .tg-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          border-radius: 16px;
        }

        .tg-icon-wrap svg {
          width: 26px;
          height: 26px;
        }

        .tag--indigo { background: linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.2)); border: 1px solid rgba(99,102,241,0.35); color: #818cf8; }
        .tag--amber  { background: linear-gradient(135deg,rgba(245,158,11,0.2),rgba(217,119,6,0.2));  border: 1px solid rgba(245,158,11,0.35); color: #fbbf24; }
        .tag--red    { background: linear-gradient(135deg,rgba(239,68,68,0.2),rgba(220,38,38,0.2));   border: 1px solid rgba(239,68,68,0.35);  color: #f87171; }
        .tag--orange { background: linear-gradient(135deg,rgba(249,115,22,0.2),rgba(234,88,12,0.2));  border: 1px solid rgba(249,115,22,0.35); color: #fb923c; }
        .tag--slate  { background: linear-gradient(135deg,rgba(100,116,139,0.2),rgba(71,85,105,0.2)); border: 1px solid rgba(100,116,139,0.3); color: #94a3b8; }

        /* ── Typography ─────────────────────────────────────────── */
        .tg-heading {
          font-size: 17px;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0;
          letter-spacing: -0.01em;
          line-height: 1.3;
        }

        .tg-body {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.6;
          margin: 0;
        }

        .tg-body strong {
          color: #c7d2fe;
          font-weight: 600;
        }

        /* ── Error notice ────────────────────────────────────────── */
        .tg-error {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 8px;
          padding: 6px 10px;
          border-radius: 8px;
          background: rgba(239,68,68,0.12);
          border: 1px solid rgba(239,68,68,0.25);
          color: #fca5a5;
          font-size: 11.5px;
          font-weight: 500;
        }

        .tg-error svg {
          width: 13px;
          height: 13px;
          flex-shrink: 0;
        }

        /* ── CTA Button ─────────────────────────────────────────── */
        .tg-cta {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 22px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          color: #fff;
          background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
          border: none;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 16px rgba(99,102,241,0.35);
          letter-spacing: 0.01em;
          margin-top: 2px;
        }

        .tg-cta svg {
          width: 15px;
          height: 15px;
        }

        .tg-cta:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(99,102,241,0.45);
        }

        .tg-cta:active:not(:disabled) {
          transform: translateY(0);
        }

        .tg-cta:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ── Pending pulse dots ──────────────────────────────────── */
        .tg-pulse-row {
          display: flex;
          gap: 7px;
          align-items: center;
          margin-top: 4px;
        }

        .tg-pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #fbbf24;
          animation: tg-pulse 1.2s ease-in-out infinite;
          opacity: 0.6;
        }

        @keyframes tg-pulse {
          0%, 100% { transform: scale(0.8); opacity: 0.4; }
          50%       { transform: scale(1.3); opacity: 1;   }
        }

        /* Spin helper */
        .tg-spin {
          animation: tg-spin 1s linear infinite;
        }

        @keyframes tg-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
