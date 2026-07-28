"use client";

import React from "react";
import { Lock, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

interface AdminOnlyGateProps {
  /** The content to show only for admins (e.g. the chat input area) */
  children: React.ReactNode;
}

/**
 * AdminOnlyGate
 *
 * Renders `children` only when the logged-in user is ADMIN.
 * For all other roles it renders a clean, branded notice panel.
 *
 * Designed to wrap the *input area only* inside ChatSection so the
 * message history remains visible while the compose box is hidden.
 */
export default function AdminOnlyGate({ children }: AdminOnlyGateProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // While auth is loading render nothing to avoid flicker
  if (loading) return null;

  // Admin — render children as-is
  if (user?.role === "ADMIN") {
    return <>{children}</>;
  }

  // Non-admin — render the notice panel
  return (
    <div className="admin-only-gate">
      <div className="admin-only-gate__card">
        {/* Icon badge */}
        <div className="admin-only-gate__icon-wrap">
          <Lock className="admin-only-gate__icon" />
        </div>

        {/* Text */}
        <div className="admin-only-gate__text">
          <p className="admin-only-gate__title">Admin-Only Feature</p>
          <p className="admin-only-gate__body">
            This assistant is restricted to administrators. Use the{" "}
            <strong>Valuation Agent</strong> to request property valuations and
            access AI-powered insights.
          </p>
        </div>

        {/* CTA */}
        <button
          id="admin-gate-valuation-cta"
          className="admin-only-gate__cta"
          onClick={() => router.push("/valuation")}
        >
          Go to Valuation Agent
          <ArrowRight className="admin-only-gate__cta-icon" />
        </button>
      </div>

      <style>{`
        .admin-only-gate {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px 16px 16px;
          background: linear-gradient(
            135deg,
            rgba(15, 23, 42, 0.85) 0%,
            rgba(30, 41, 59, 0.9) 100%
          );
          border-top: 1px solid rgba(99, 102, 241, 0.15);
          border-radius: 0 0 16px 16px;
          backdrop-filter: blur(12px);
        }

        .admin-only-gate__card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          max-width: 320px;
          text-align: center;
        }

        .admin-only-gate__icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2));
          border: 1px solid rgba(99,102,241,0.3);
          flex-shrink: 0;
        }

        .admin-only-gate__icon {
          width: 20px;
          height: 20px;
          color: #818cf8;
        }

        .admin-only-gate__text {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .admin-only-gate__title {
          font-size: 13px;
          font-weight: 700;
          color: #e2e8f0;
          letter-spacing: 0.01em;
          margin: 0;
        }

        .admin-only-gate__body {
          font-size: 11.5px;
          color: #94a3b8;
          line-height: 1.55;
          margin: 0;
        }

        .admin-only-gate__body strong {
          color: #c7d2fe;
          font-weight: 600;
        }

        .admin-only-gate__cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          color: #fff;
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          border: none;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          letter-spacing: 0.01em;
        }

        .admin-only-gate__cta:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .admin-only-gate__cta:active {
          transform: translateY(0);
        }

        .admin-only-gate__cta-icon {
          width: 13px;
          height: 13px;
        }
      `}</style>
    </div>
  );
}
