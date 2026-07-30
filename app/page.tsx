'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import {
  TrendingUp, Cpu, Globe, Clock, Sparkles, Play,
  Bot, Shield, ArrowRight, Building2, CheckCircle2,
  BarChart2, MapPin, Zap
} from 'lucide-react';

// ── Stat items ────────────────────────────────────────────────────────────────
const STATS = [
  { label: 'Valuation Engine', value: 'Active', icon: TrendingUp, color: 'text-emerald-400' },
  { label: 'AI Models', value: '3+', icon: Cpu, color: 'text-indigo-400' },
  { label: 'Data Sources', value: '20+', icon: Globe, color: 'text-sky-400' },
  { label: 'Avg Latency', value: '<2s', icon: Clock, color: 'text-amber-400' },
];

export default function HomePage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isAdmin = user?.role === 'ADMIN';
  const isEnterprise = !!user?.active_org;
  const isEnterpriseOwner = user?.active_org?.org_role === 'OWNER';

  let disabledNotice = '';
  if (isAdmin) {
    disabledNotice = 'Admin Account — Unlimited Access';
  } else if (isEnterpriseOwner) {
    disabledNotice = 'Enterprise Account — Managed via Org Billing';
  } else if (isEnterprise) {
    disabledNotice = 'Enterprise Account — Covered by Org Token Pool';
  }

  const isBuyDisabled = isAdmin || isEnterprise;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        .hp-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f0f4ff 0%, #fafbff 45%, #f5f0ff 100%);
          font-family: 'Inter', system-ui, sans-serif;
          position: relative;
          overflow: hidden;
        }
        .hp-page::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(#4f46e5 1px, transparent 1px);
          background-size: 40px 40px;
          opacity: 0.035;
          pointer-events: none;
        }

        /* ── Floating background glows ── */
        .hp-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          animation: blobFloat 9s ease-in-out infinite;
        }
        .hp-blob-1 {
          width: 550px; height: 550px;
          background: radial-gradient(circle, rgba(79,70,229,.14), transparent);
          top: -120px; left: -150px;
          animation-delay: 0s;
        }
        .hp-blob-2 {
          width: 450px; height: 450px;
          background: radial-gradient(circle, rgba(124,58,237,.12), transparent);
          top: 150px; right: -100px;
          animation-delay: 3.5s;
        }
        .hp-blob-3 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(14,165,233,.09), transparent);
          bottom: 50px; left: 35%;
          animation-delay: 6s;
        }
        @keyframes blobFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-25px) scale(1.04); }
        }

        /* ── Hero Container ── */
        .hp-hero-wrap {
          position: relative;
          z-index: 10;
          padding: 108px 56px 64px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .hp-hero-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 48px;
          align-items: center;
        }
        @media (max-width: 1024px) {
          .hp-hero-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
        }

        /* ── Left Column ── */
        .hp-left {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .hp-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 100px;
          background: rgba(79,70,229,.08);
          border: 1px solid rgba(79,70,229,.16);
          width: fit-content;
        }
        .hp-eyebrow-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #4f46e5;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        .hp-eyebrow-text {
          font-size: 11px;
          font-weight: 800;
          color: #4f46e5;
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }
        .hp-title {
          font-size: clamp(34px, 4.2vw, 54px);
          font-weight: 900;
          color: #0f172a;
          line-height: 1.1;
          letter-spacing: -1.5px;
        }
        .hp-title span {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hp-subtitle {
          font-size: 15px;
          color: #64748b;
          font-weight: 500;
          line-height: 1.7;
          max-width: 580px;
        }
        .hp-cta-row {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          margin-top: 4px;
        }
        .hp-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 16px 32px;
          border-radius: 16px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: #fff;
          font-size: 13.5px;
          font-weight: 800;
          text-decoration: none;
          letter-spacing: 0.05em;
          box-shadow: 0 10px 28px rgba(79,70,229,.35);
          transition: all 0.25s ease;
          border: none;
          cursor: pointer;
        }
        .hp-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 36px rgba(79,70,229,.45);
        }

        /* Stats pills */
        .hp-stats {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 12px;
        }
        .hp-stat-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(255,255,255,.75);
          border: 1px solid rgba(226,232,240,.9);
          border-radius: 100px;
          backdrop-filter: blur(8px);
          box-shadow: 0 2px 8px rgba(0,0,0,.04);
        }
        .hp-stat-value {
          font-size: 13.5px;
          font-weight: 900;
          color: #0f172a;
        }
        .hp-stat-label {
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
        }

        /* ── Right Column: Interactive Illustration ── */
        .hp-right {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hp-illus-card {
          position: relative;
          width: 100%;
          max-width: 480px;
          background: rgba(255,255,255,.90);
          border: 1.5px solid rgba(226,232,240,.9);
          border-radius: 28px;
          padding: 28px;
          box-shadow: 0 24px 64px rgba(15,23,42,.09), 0 4px 16px rgba(79,70,229,.05);
          backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .hp-illus-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 16px;
          border-b: 1px solid #f1f5f9;
        }
        .hp-illus-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 100px;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #059669;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
        }
        .hp-illus-val-box {
          background: linear-gradient(135deg, #0f172a, #1e1b4b);
          border-radius: 20px;
          padding: 20px;
          color: #fff;
          position: relative;
          overflow: hidden;
        }
        .hp-illus-val-box::before {
          content: '';
          position: absolute;
          top: -30px; right: -30px;
          width: 140px; height: 140px;
          background: radial-gradient(circle, rgba(99,102,241,.35), transparent 70%);
          border-radius: 50%;
        }
        .hp-illus-val-label {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: #818cf8;
        }
        .hp-illus-val-num {
          font-size: 26px;
          font-weight: 900;
          color: #fff;
          margin-top: 4px;
          letter-spacing: -0.5px;
        }
        .hp-illus-val-sub {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 2px;
        }

        /* Floating badges on illustration */
        .hp-float-card-1 {
          position: absolute;
          top: -16px;
          left: -20px;
          background: #fff;
          border: 1px solid #e2e8f0;
          padding: 10px 16px;
          border-radius: 16px;
          box-shadow: 0 12px 28px rgba(0,0,0,.08);
          display: flex;
          align-items: center;
          gap: 10px;
          animation: floatSlow 6s ease-in-out infinite;
        }
        .hp-float-card-2 {
          position: absolute;
          bottom: -16px;
          right: -16px;
          background: #fff;
          border: 1px solid #e2e8f0;
          padding: 10px 16px;
          border-radius: 16px;
          box-shadow: 0 12px 28px rgba(0,0,0,.08);
          display: flex;
          align-items: center;
          gap: 10px;
          animation: floatSlow 6s ease-in-out infinite 3s;
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        /* ── Role Banner ── */
        .hp-role-banner {
          position: relative;
          z-index: 10;
          padding: 0 56px 40px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .hp-role-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 20px 28px;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(79,70,229,.06), rgba(124,58,237,.04));
          border: 1.5px solid rgba(79,70,229,.12);
          flex-wrap: wrap;
        }
        .hp-role-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .hp-role-icon {
          width: 40px; height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 16px rgba(79,70,229,.25);
        }
        .hp-role-greeting {
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
        }
        .hp-role-sub {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
          margin-top: 1px;
        }
        .hp-role-badge {
          padding: 5px 12px;
          border-radius: 100px;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }
        .hp-role-badge-admin { background: rgba(124,58,237,.1); color: #7c3aed; border: 1px solid rgba(124,58,237,.2); }
        .hp-role-badge-user { background: rgba(16,185,129,.1); color: #059669; border: 1px solid rgba(16,185,129,.2); }

        /* ── Super Agent Section ── */
        .hp-super-agent {
          position: relative;
          z-index: 10;
          padding: 0 56px 64px;
          max-width: 1400px;
          margin: 0 auto;
        }

        /* ── Pricing Section ── */
        .hp-pricing-section {
          position: relative;
          z-index: 10;
          padding: 0 56px 64px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .hp-pricing-header {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-bottom: 40px;
        }
        .hp-pricing-title {
          font-size: 32px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.8px;
        }
        .hp-pricing-sub {
          font-size: 14px;
          color: #64748b;
          max-width: 560px;
          line-height: 1.6;
        }
        .hp-pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }
        .hp-price-card {
          background: rgba(255,255,255,.85);
          border: 1.5px solid rgba(226,232,240,.9);
          border-radius: 28px;
          padding: 32px;
          backdrop-filter: blur(16px);
          display: flex;
          flex-direction: column;
          position: relative;
          box-shadow: 0 16px 40px rgba(0,0,0,.04);
          transition: all 0.25s ease;
        }
        .hp-price-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 24px 52px rgba(0,0,0,.08);
        }
        .hp-price-card-feat {
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
          border-color: rgba(99,102,241,.4);
          box-shadow: 0 24px 56px rgba(79,70,229,.22);
        }
        .hp-price-card-feat:hover {
          box-shadow: 0 32px 64px rgba(79,70,229,.32);
        }
        .hp-price-badge {
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          padding: 4px 12px;
          border-radius: 100px;
          width: fit-content;
          margin-bottom: 16px;
        }
        .hp-price-badge-free { background: #f1f5f9; color: #475569; }
        .hp-price-badge-feat { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; }
        .hp-price-badge-ent { background: #e0e7ff; color: #4338ca; }
        .hp-price-name { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
        .hp-price-val { font-size: 32px; font-weight: 900; color: #0f172a; letter-spacing: -1px; margin-bottom: 8px; }
        .hp-price-desc { font-size: 12.5px; color: #64748b; line-height: 1.5; margin-bottom: 4px; }
        .hp-price-list { list-style: none; padding: 0; margin: 0 0 24px; display: flex; flex-direction: column; gap: 12px; font-size: 13px; font-weight: 500; color: #334155; }
        .hp-price-list li { display: flex; items-center; gap: 10px; }
        .hp-price-btn {
          margin-top: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          border-radius: 14px;
          font-size: 12.5px;
          font-weight: 800;
          text-decoration: none;
          transition: all 0.2s;
        }
        .hp-price-btn-pri {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: #fff;
          box-shadow: 0 6px 20px rgba(79,70,229,.35);
        }
        .hp-price-btn-pri:hover { opacity: 0.95; transform: translateY(-1px); }
        .hp-price-btn-sec {
          background: rgba(255,255,255,.9);
          border: 1.5px solid #e2e8f0;
          color: #0f172a;
        }
        .hp-price-btn-sec:hover { border-color: #4f46e5; color: #4f46e5; }
        .hp-super-card {
          position: relative;
          background: linear-gradient(135deg, #0f0c29 0%, #1a0533 50%, #0f172a 100%);
          border-radius: 28px;
          padding: 48px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.07);
          box-shadow: 0 32px 64px rgba(0,0,0,.22);
        }
        .hp-super-card::before {
          content: '';
          position: absolute;
          top: -60px; right: -60px;
          width: 300px; height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(124,58,237,.3), transparent 70%);
          pointer-events: none;
        }
        .hp-super-grid {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 48px;
          align-items: center;
        }
        @media (max-width: 900px) {
          .hp-super-grid { grid-template-columns: 1fr; gap: 32px; }
        }
        .hp-super-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 100px;
          background: rgba(124,58,237,.15);
          border: 1px solid rgba(124,58,237,.25);
          margin-bottom: 20px;
          width: fit-content;
        }
        .hp-super-eyebrow-text {
          font-size: 11px;
          font-weight: 800;
          color: #a78bfa;
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }
        .hp-super-title {
          font-size: 36px;
          font-weight: 900;
          color: #fff;
          letter-spacing: -1px;
          line-height: 1.1;
          margin-bottom: 8px;
        }
        .hp-super-tag {
          font-size: 14px;
          font-weight: 700;
          color: #a78bfa;
          letter-spacing: 0.05em;
          margin-bottom: 18px;
        }
        .hp-super-desc {
          font-size: 14px;
          color: rgba(255,255,255,.6);
          line-height: 1.8;
          font-weight: 400;
          max-width: 520px;
        }
        .hp-super-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 24px;
          padding: 10px 20px;
          border-radius: 100px;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.1);
          backdrop-filter: blur(8px);
        }
        .hp-super-badge-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #f59e0b;
          animation: pulse 1.5s ease-in-out infinite;
        }
        .hp-super-badge-text {
          font-size: 11px;
          font-weight: 800;
          color: rgba(255,255,255,.75);
          text-transform: uppercase;
          letter-spacing: 0.2em;
        }

        .hp-super-right {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .hp-super-agent-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 18px;
          border-radius: 16px;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.07);
          transition: all 0.2s;
        }
        .hp-super-agent-pill:hover {
          background: rgba(255,255,255,.07);
          border-color: rgba(255,255,255,.12);
          transform: translateX(4px);
        }
        .hp-super-agent-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .hp-super-agent-name {
          font-size: 13px;
          font-weight: 700;
          color: rgba(255,255,255,.85);
          flex: 1;
        }
        .hp-super-agent-status {
          font-size: 10px;
          font-weight: 800;
          color: rgba(255,255,255,.3);
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }
        .hp-super-agent-status.active { color: #34d399; }
        .hp-super-agent-status.incoming { color: #f59e0b; }

        /* ── Footer ── */
        .hp-footer {
          position: relative;
          z-index: 10;
          border-top: 1px solid rgba(226,232,240,.7);
          padding: 20px 56px;
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        /* ── Anim ── */
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hp-animate {
          animation: fadeSlideUp .55s ease forwards;
          opacity: 0;
        }
        .hp-delay-1 { animation-delay: .08s; }
        .hp-delay-2 { animation-delay: .16s; }
        .hp-delay-3 { animation-delay: .24s; }
        .hp-delay-4 { animation-delay: .32s; }
      `}</style>

      <div className="hp-page">
        {/* Floating background blobs */}
        <div className="hp-blob hp-blob-1" />
        <div className="hp-blob hp-blob-2" />
        <div className="hp-blob hp-blob-3" />

        {/* ── Role Greeting Banner ─────────────────────────── */}
        {mounted && user && (
          <div className="hp-role-banner" style={{ paddingTop: 96 }}>
            <div className="hp-role-card hp-animate hp-delay-1">
              <div className="hp-role-left">
                <div className="hp-role-icon">
                  <Cpu style={{ width: 20, height: 20, color: '#fff' }} />
                </div>
                <div>
                  <div className="hp-role-greeting">
                    Welcome back, {user.username}
                  </div>
                  <div className="hp-role-sub">
                    {isAdmin
                      ? 'Administrator Mode — All platform features and agent modules enabled.'
                      : 'Valuation Agent Access — Explore AI-driven asset pricing and insights.'}
                  </div>
                </div>
              </div>
              <span className={`hp-role-badge ${isAdmin ? 'hp-role-badge-admin' : 'hp-role-badge-user'}`}>
                {isAdmin ? 'ADMINISTRATOR' : 'USER'}
              </span>
            </div>
          </div>
        )}

        {/* ── Hero Section ─────────────────────────────────── */}
        <div className="hp-hero-wrap" style={{ paddingTop: mounted && user ? 0 : 108 }}>
          <div className="hp-hero-grid">
            {/* Left Column: Text & CTA */}
            <div className="hp-left">
              <div className="hp-eyebrow hp-animate hp-delay-1">
                <div className="hp-eyebrow-dot" />
                <span className="hp-eyebrow-text">Sigmavalue AI Pilot — Intelligent Platform</span>
              </div>

              <h1 className="hp-title hp-animate hp-delay-2">
                AI Agents for <span>Real Estate Intelligence</span>
              </h1>

              <p className="hp-subtitle hp-animate hp-delay-3">
                Automated property valuation, comparative market adjustments, and AI-driven pricing analytics tailored for professional real estate workflows.
              </p>

              <div className="hp-cta-row hp-animate hp-delay-4">
                <Link href={user ? "/valuation" : "/auth"} className="hp-btn-primary">
                  <Play style={{ width: 16, height: 16 }} />
                  Go to Valuation Agent
                </Link>
              </div>

              {/* Stats pills */}
              <div className="hp-stats hp-animate hp-delay-4">
                {STATS.map((s) => (
                  <div key={s.label} className="hp-stat-pill">
                    <s.icon style={{ width: 14, height: 14 }} className={s.color} />
                    <span className="hp-stat-value">{s.value}</span>
                    <span className="hp-stat-label">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Interactive Illustration */}
            <div className="hp-right hp-animate hp-delay-3">
              <div className="hp-illus-card">
                <div className="hp-illus-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4f46e5' }} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>
                      Valuation Engine v2.4
                    </span>
                  </div>
                  <span className="hp-illus-badge">
                    <CheckCircle2 style={{ width: 12, height: 12 }} /> Live
                  </span>
                </div>

                <div className="hp-illus-val-box">
                  <div className="hp-illus-val-label">Estimated Market Value</div>
                  <div className="hp-illus-val-num">₹ 4,85,00,000</div>
                  <div className="hp-illus-val-sub">Confidence Score: 96.4% • Based on 14 Comparables</div>
                </div>

                {/* Micro Metric items inside card */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 14, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Avg Rate / sqft</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', marginTop: 2 }}>₹ 14,250</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 14, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Location Index</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#4f46e5', marginTop: 2 }}>9.2 / 10</div>
                  </div>
                </div>

                {/* Floating badge 1 */}
                <div className="hp-float-card-1">
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <TrendingUp style={{ width: 16, height: 16 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a' }}>+12.4% YoY</div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8' }}>Micro-market Growth</div>
                  </div>
                </div>

                {/* Floating badge 2 */}
                <div className="hp-float-card-2">
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <Bot style={{ width: 16, height: 16 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a' }}>AI Valuation Agent</div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8' }}>Real-time Analysis</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Super Agent Section ──────────────────────────── */}
        <div className="hp-super-agent">
          <div className="hp-super-card hp-animate hp-delay-3">
            <div className="hp-super-grid">
              {/* Left Column */}
              <div>
                <div className="hp-super-eyebrow">
                  <Sparkles style={{ width: 13, height: 13, color: '#a78bfa' }} />
                  <span className="hp-super-eyebrow-text">Multi-Agent Orchestration</span>
                </div>
                <h2 className="hp-super-title">Super Agent</h2>
                <div className="hp-super-tag">Multi-agent workflow orchestration</div>
                <p className="hp-super-desc">
                  The Super Agent will coordinate valuation, market research, feasibility, transaction and location intelligence agents &amp; other agents to complete complex real estate workflows.
                </p>
                <div className="hp-super-badge">
                  <div className="hp-super-badge-dot" />
                  <span className="hp-super-badge-text">Coming Soon</span>
                </div>
              </div>

              {/* Right Column: Agent pipeline status */}
              <div className="hp-super-right">
                {[
                  { name: 'Valuation Agent', color: '#10b981', status: 'ACTIVE', isLive: true },
                  { name: 'Market Research Agent', color: '#fb923c', status: 'COMING SOON', isLive: false },
                  { name: 'Feasibility Agent', color: '#f472b6', status: 'COMING SOON', isLive: false },
                  { name: 'Location Intelligence', color: '#38bdf8', status: 'COMING SOON', isLive: false },
                  { name: 'Transaction Agent', color: '#fbbf24', status: 'COMING SOON', isLive: false },
                  { name: 'Other Specialized Agents', color: '#94a3b8', status: 'PLANNED', isLive: false },
                ].map((ag) => (
                  <div key={ag.name} className="hp-super-agent-pill">
                    <div className="hp-super-agent-dot" style={{ background: ag.color }} />
                    <span className="hp-super-agent-name">{ag.name}</span>
                    <span className={`hp-super-agent-status ${ag.isLive ? 'active' : 'incoming'}`}>
                      {ag.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Pricing & Token Plans Section ────────────────── */}
        <div className="hp-pricing-section">
          <div className="hp-pricing-header hp-animate hp-delay-2">
            <div className="hp-eyebrow">
              <Zap style={{ width: 13, height: 13, color: '#f59e0b' }} />
              <span className="hp-eyebrow-text">Transparent Pay-As-You-Go Pricing</span>
            </div>
            <h2 className="hp-pricing-title">Flexible Plans &amp; Token Packs</h2>
            <p className="hp-pricing-sub">
              Start with free credits upon sign up, or purchase high-volume token packs with instant Stripe checkout for professional real estate analysis workflows.
            </p>
          </div>

          <div className="hp-pricing-grid">
            {/* Free Plan */}
            <div className="hp-price-card">
              <div className="hp-price-badge hp-price-badge-free">Starter</div>
              <div className="hp-price-name">Free Sign Up</div>
              <div className="hp-price-val">₹0 <span style={{ fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>/ forever</span></div>
              <p className="hp-price-desc">Ideal for trying out the AI Valuation Agent &amp; basic location tools.</p>
              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '20px 0' }} />
              <ul className="hp-price-list">
                <li><CheckCircle2 style={{ width: 16, height: 16, color: '#10b981' }} /> 10,000 Free Credits on Registration</li>
                <li><CheckCircle2 style={{ width: 16, height: 16, color: '#10b981' }} /> Valuation Agent Access</li>
                <li><CheckCircle2 style={{ width: 16, height: 16, color: '#10b981' }} /> Standard AI Processing Speed</li>
                <li><CheckCircle2 style={{ width: 16, height: 16, color: '#10b981' }} /> Email &amp; Password / Google Sign In</li>
              </ul>
              <Link href={user ? "/valuation" : "/auth"} className="hp-price-btn hp-price-btn-sec">
                {user ? "Go to Valuation Agent" : "Get Started Free"}
              </Link>
            </div>

            {/* Token Pack - Featured */}
            <div className="hp-price-card hp-price-card-feat">
              <div className="hp-price-badge hp-price-badge-feat">Popular</div>
              <div className="hp-price-name" style={{ color: '#fff' }}>1,000,000 Token Pack</div>
              <div className="hp-price-val" style={{ color: '#fff' }}>₹5,000 <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,.6)' }}>/ one-time</span></div>
              <p className="hp-price-desc" style={{ color: 'rgba(255,255,255,.7)' }}>High-volume token pack for professional real estate analysts &amp; firms.</p>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,.1)', margin: '20px 0' }} />
              <ul className="hp-price-list" style={{ color: 'rgba(255,255,255,.9)' }}>
                <li><CheckCircle2 style={{ width: 16, height: 16, color: '#34d399' }} /> 1,000,000 High-Priority AI Tokens</li>
                <li><CheckCircle2 style={{ width: 16, height: 16, color: '#34d399' }} /> Instant Wallet Credit via Stripe</li>
                <li><CheckCircle2 style={{ width: 16, height: 16, color: '#34d399' }} /> Full Valuation Engine Access</li>
                <li><CheckCircle2 style={{ width: 16, height: 16, color: '#34d399' }} /> Never Expires • Pay As You Go</li>
              </ul>
              {isBuyDisabled ? (
                <div className="hp-price-btn" style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: 'rgba(255,255,255,.8)', cursor: 'not-allowed', fontSize: 11 }}>
                  <Shield style={{ width: 14, height: 14, color: '#f59e0b' }} /> {disabledNotice}
                </div>
              ) : (
                <Link href="/pricing" className="hp-price-btn hp-price-btn-pri">
                  Buy Token Pack <ArrowRight style={{ width: 15, height: 15 }} />
                </Link>
              )}
            </div>

            {/* Enterprise Plan */}
            <div className="hp-price-card">
              <div className="hp-price-badge hp-price-badge-ent">Enterprise</div>
              <div className="hp-price-name">Custom Firm Solution</div>
              <div className="hp-price-val">Custom <span style={{ fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>/ team</span></div>
              <p className="hp-price-desc">Tailored multi-seat workspaces, custom agent integration &amp; dedicated SLA.</p>
              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '20px 0' }} />
              <ul className="hp-price-list">
                <li><CheckCircle2 style={{ width: 16, height: 16, color: '#4f46e5' }} /> Shared Team Organization Wallet</li>
                <li><CheckCircle2 style={{ width: 16, height: 16, color: '#4f46e5' }} /> Custom Real Estate Data Pipelines</li>
                <li><CheckCircle2 style={{ width: 16, height: 16, color: '#4f46e5' }} /> Dedicated Account Manager &amp; Support</li>
                <li><CheckCircle2 style={{ width: 16, height: 16, color: '#4f46e5' }} /> Admin Controls &amp; Seat Management</li>
              </ul>
              <Link href="/pricing#enterprise-contact" className="hp-price-btn hp-price-btn-sec">
                Contact Enterprise Sales
              </Link>
            </div>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <footer className="hp-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              System Operational
            </span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            © 2026 Sigmavalue AI Corp
          </span>
        </footer>
      </div>
    </>
  );
}
