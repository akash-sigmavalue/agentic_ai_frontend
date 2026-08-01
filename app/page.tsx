'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import {
  TrendingUp, Cpu, Globe, Clock, Sparkles, Play,
  Bot, Shield, ArrowRight, Building2, CheckCircle2,
  BarChart2, MapPin, Zap
} from 'lucide-react';

// ── Stat items ────────────────────────────────────────────────────────────────
const STATS = [
  { label: 'Valuation Engine', value: 'Active', icon: TrendingUp, color: 'text-emerald-500' },
  { label: 'AI Models', value: '3+', icon: Cpu, color: 'text-indigo-500' },
  { label: 'Data Sources', value: '20+', icon: Globe, color: 'text-sky-500' },
  { label: 'Avg Latency', value: '<2s', icon: Clock, color: 'text-amber-500' },
];

export default function HomePage() {
  const { user } = useAuth();
  const isDark = useTheme();
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
          background: ${isDark
            ? 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #090d16 100%)'
            : 'linear-gradient(135deg, #f0f4ff 0%, #fafbff 45%, #f5f0ff 100%)'};
          color: ${isDark ? '#f8fafc' : '#0f172a'};
          font-family: 'Inter', system-ui, sans-serif;
          position: relative;
          overflow: hidden;
          transition: background 0.3s ease, color 0.3s ease;
        }
        .hp-page::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(${isDark ? '#818cf8' : '#4f46e5'} 1px, transparent 1px);
          background-size: 40px 40px;
          opacity: ${isDark ? '0.05' : '0.035'};
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
          background: radial-gradient(circle, ${isDark ? 'rgba(99,102,241,.2)' : 'rgba(79,70,229,.14)'}, transparent);
          top: -120px; left: -150px;
          animation-delay: 0s;
        }
        .hp-blob-2 {
          width: 450px; height: 450px;
          background: radial-gradient(circle, ${isDark ? 'rgba(139,92,246,.18)' : 'rgba(124,58,237,.12)'}, transparent);
          top: 150px; right: -100px;
          animation-delay: 3.5s;
        }
        .hp-blob-3 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, ${isDark ? 'rgba(56,189,248,.12)' : 'rgba(14,165,233,.09)'}, transparent);
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
          .hp-hero-wrap { padding: 96px 24px 48px; }
          .hp-hero-grid { grid-template-columns: 1fr; gap: 40px; }
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
          background: ${isDark ? 'rgba(99,102,241,.15)' : 'rgba(79,70,229,.08)'};
          border: 1px solid ${isDark ? 'rgba(99,102,241,.3)' : 'rgba(79,70,229,.16)'};
          width: fit-content;
        }
        .hp-eyebrow-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: ${isDark ? '#818cf8' : '#4f46e5'};
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        .hp-eyebrow-text {
          font-size: 11px;
          font-weight: 800;
          color: ${isDark ? '#a5b4fc' : '#4f46e5'};
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }
        .hp-title {
          font-size: clamp(34px, 4.2vw, 54px);
          font-weight: 900;
          color: ${isDark ? '#ffffff' : '#0f172a'};
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
          color: ${isDark ? '#94a3b8' : '#475569'};
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
          font-size: 14px;
          font-weight: 800;
          text-decoration: none;
          box-shadow: 0 8px 24px rgba(79,70,229,.35);
          transition: all 0.25s ease;
        }
        .hp-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(79,70,229,.45);
        }
        .hp-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 16px 28px;
          border-radius: 16px;
          background: ${isDark ? 'rgba(30,41,59,.8)' : 'rgba(255,255,255,.9)'};
          border: 1.5px solid ${isDark ? '#334155' : '#e2e8f0'};
          color: ${isDark ? '#f1f5f9' : '#0f172a'};
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          backdrop-filter: blur(8px);
          transition: all 0.25s ease;
        }
        .hp-btn-secondary:hover {
          border-color: #4f46e5;
          color: #4f46e5;
          transform: translateY(-1px);
        }

        /* ── Micro Stats ── */
        .hp-stats-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 12px;
        }
        .hp-stat-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: ${isDark ? 'rgba(15,23,42,.8)' : 'rgba(255,255,255,.85)'};
          border: 1px solid ${isDark ? '#1e293b' : 'rgba(226,232,240,.9)'};
          border-radius: 100px;
          backdrop-filter: blur(8px);
          box-shadow: 0 2px 8px rgba(0,0,0,.04);
        }
        .hp-stat-value {
          font-size: 13.5px;
          font-weight: 900;
          color: ${isDark ? '#f8fafc' : '#0f172a'};
        }
        .hp-stat-label {
          font-size: 11px;
          font-weight: 600;
          color: ${isDark ? '#94a3b8' : '#64748b'};
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
          background: ${isDark ? 'rgba(15,23,42,.92)' : 'rgba(255,255,255,.94)'};
          border: 1.5px solid ${isDark ? '#1e293b' : 'rgba(226,232,240,.9)'};
          border-radius: 28px;
          padding: 28px;
          box-shadow: ${isDark ? '0 24px 64px rgba(0,0,0,.6)' : '0 24px 64px rgba(15,23,42,.09)'};
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
          border-bottom: 1px solid ${isDark ? '#1e293b' : '#f1f5f9'};
        }
        .hp-illus-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 100px;
          background: ${isDark ? 'rgba(16,185,129,.15)' : '#ecfdf5'};
          border: 1px solid ${isDark ? 'rgba(16,185,129,.3)' : '#a7f3d0'};
          color: ${isDark ? '#34d399' : '#059669'};
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
          background: ${isDark ? '#0f172a' : '#ffffff'};
          border: 1px solid ${isDark ? '#334155' : '#e2e8f0'};
          color: ${isDark ? '#f8fafc' : '#0f172a'};
          padding: 10px 16px;
          border-radius: 16px;
          box-shadow: ${isDark ? '0 12px 28px rgba(0,0,0,.4)' : '0 12px 28px rgba(0,0,0,.08)'};
          display: flex;
          align-items: center;
          gap: 10px;
          animation: floatSlow 6s ease-in-out infinite;
        }
        .hp-float-card-2 {
          position: absolute;
          bottom: -16px;
          right: -16px;
          background: ${isDark ? '#0f172a' : '#ffffff'};
          border: 1px solid ${isDark ? '#334155' : '#e2e8f0'};
          color: ${isDark ? '#f8fafc' : '#0f172a'};
          padding: 10px 16px;
          border-radius: 16px;
          box-shadow: ${isDark ? '0 12px 28px rgba(0,0,0,.4)' : '0 12px 28px rgba(0,0,0,.08)'};
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
          background: ${isDark ? 'rgba(15,23,42,.8)' : 'linear-gradient(135deg, rgba(79,70,229,.06), rgba(124,58,237,.04))'};
          border: 1.5px solid ${isDark ? '#1e293b' : 'rgba(79,70,229,.12)'};
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
          color: #fff;
          box-shadow: 0 6px 16px rgba(79,70,229,.25);
        }
        .hp-role-greeting {
          font-size: 14px;
          font-weight: 800;
          color: ${isDark ? '#f8fafc' : '#0f172a'};
        }
        .hp-role-sub {
          font-size: 12px;
          color: ${isDark ? '#94a3b8' : '#64748b'};
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
        .hp-role-badge-admin { background: rgba(124,58,237,.15); color: ${isDark ? '#c4b5fd' : '#7c3aed'}; border: 1px solid rgba(124,58,237,.25); }
        .hp-role-badge-user { background: rgba(16,185,129,.15); color: ${isDark ? '#6ee7b7' : '#059669'}; border: 1px solid rgba(16,185,129,.25); }

        /* ── Super Agent Section ── */
        .hp-super-agent {
          position: relative;
          z-index: 10;
          padding: 0 56px 64px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .hp-super-card {
          position: relative;
          background: ${isDark
            ? 'linear-gradient(135deg, #0f0c29 0%, #1a0533 50%, #0f172a 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 50%, #eef2ff 100%)'};
          border-radius: 28px;
          padding: 48px;
          overflow: hidden;
          border: 1.5px solid ${isDark ? 'rgba(255,255,255,.1)' : 'rgba(99,102,241,.2)'};
          box-shadow: ${isDark ? '0 32px 64px rgba(0,0,0,.25)' : '0 20px 48px rgba(79,70,229,.1)'};
          color: ${isDark ? '#fff' : '#0f172a'};
          transition: all 0.3s ease;
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
          .hp-super-agent { padding: 0 24px 48px; }
          .hp-super-card { padding: 28px 24px; }
          .hp-super-grid { grid-template-columns: 1fr; gap: 32px; }
        }
        .hp-super-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 100px;
          background: ${isDark ? 'rgba(124,58,237,.2)' : 'rgba(79,70,229,.08)'};
          border: 1px solid ${isDark ? 'rgba(124,58,237,.35)' : 'rgba(79,70,229,.2)'};
          margin-bottom: 20px;
          width: fit-content;
        }
        .hp-super-eyebrow-text {
          font-size: 11px;
          font-weight: 800;
          color: ${isDark ? '#c4b5fd' : '#4f46e5'};
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }
        .hp-super-title {
          font-size: 36px;
          font-weight: 900;
          color: ${isDark ? '#fff' : '#0f172a'};
          letter-spacing: -1px;
          line-height: 1.1;
          margin-bottom: 8px;
        }
        .hp-super-tag {
          font-size: 14px;
          font-weight: 700;
          color: ${isDark ? '#a78bfa' : '#4f46e5'};
          letter-spacing: 0.05em;
          margin-bottom: 18px;
        }
        .hp-super-desc {
          font-size: 14px;
          color: ${isDark ? 'rgba(255,255,255,.7)' : '#475569'};
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
          background: ${isDark ? 'rgba(255,255,255,.08)' : 'rgba(79,70,229,.06)'};
          border: 1px solid ${isDark ? 'rgba(255,255,255,.15)' : 'rgba(79,70,229,.15)'};
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
          color: ${isDark ? 'rgba(255,255,255,.9)' : '#334155'};
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
          background: ${isDark ? 'rgba(255,255,255,.06)' : '#ffffff'};
          border: 1px solid ${isDark ? 'rgba(255,255,255,.1)' : '#e2e8f0'};
          box-shadow: ${isDark ? 'none' : '0 2px 8px rgba(0,0,0,.03)'};
          transition: all 0.2s;
        }
        .hp-super-agent-pill:hover {
          background: ${isDark ? 'rgba(255,255,255,.1)' : '#f8fafc'};
          border-color: ${isDark ? 'rgba(255,255,255,.18)' : '#cbd5e1'};
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
          color: ${isDark ? 'rgba(255,255,255,.95)' : '#0f172a'};
          flex: 1;
        }
        .hp-super-agent-status {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }
        .hp-super-agent-status.active { color: ${isDark ? '#34d399' : '#059669'}; }
        .hp-super-agent-status.incoming { color: ${isDark ? '#fbf0b4' : '#d97706'}; }

        /* ── Pricing Section ── */
        .hp-pricing-section {
          position: relative;
          z-index: 10;
          padding: 0 56px 64px;
          max-width: 1400px;
          margin: 0 auto;
        }
        @media (max-width: 900px) {
          .hp-pricing-section { padding: 0 24px 48px; }
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
          color: ${isDark ? '#f8fafc' : '#0f172a'};
          letter-spacing: -0.8px;
        }
        .hp-pricing-sub {
          font-size: 14px;
          color: ${isDark ? '#94a3b8' : '#64748b'};
          max-width: 560px;
          line-height: 1.6;
        }
        .hp-pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }
        .hp-price-card {
          background: ${isDark ? 'rgba(15,23,42,.85)' : 'rgba(255,255,255,.92)'};
          border: 1.5px solid ${isDark ? '#1e293b' : 'rgba(226,232,240,.9)'};
          border-radius: 28px;
          padding: 32px;
          backdrop-filter: blur(16px);
          display: flex;
          flex-direction: column;
          position: relative;
          box-shadow: ${isDark ? '0 16px 40px rgba(0,0,0,.4)' : '0 16px 40px rgba(0,0,0,.04)'};
          transition: all 0.25s ease;
        }
        .hp-price-card:hover {
          transform: translateY(-4px);
          box-shadow: ${isDark ? '0 24px 52px rgba(0,0,0,.6)' : '0 24px 52px rgba(0,0,0,.08)'};
        }
        .hp-price-card-feat {
          background: ${isDark
            ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)'};
          border: 2px solid ${isDark ? 'rgba(99,102,241,.6)' : '#6366f1'};
          box-shadow: ${isDark ? '0 24px 56px rgba(79,70,229,.3)' : '0 20px 48px rgba(79,70,229,.15)'};
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
        .hp-price-badge-free { background: ${isDark ? '#1e293b' : '#f1f5f9'}; color: ${isDark ? '#94a3b8' : '#475569'}; }
        .hp-price-badge-feat { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; }
        .hp-price-badge-ent { background: ${isDark ? 'rgba(99,102,241,.2)' : '#e0e7ff'}; color: ${isDark ? '#a5b4fc' : '#4338ca'}; }
        .hp-price-name { font-size: 18px; font-weight: 800; color: ${isDark ? '#f8fafc' : '#0f172a'}; margin-bottom: 8px; }
        .hp-price-val { font-size: 32px; font-weight: 900; color: ${isDark ? '#f8fafc' : '#0f172a'}; letter-spacing: -1px; margin-bottom: 8px; }
        .hp-price-desc { font-size: 12.5px; color: ${isDark ? '#94a3b8' : '#64748b'}; line-height: 1.5; margin-bottom: 4px; }
        .hp-price-list { list-style: none; padding: 0; margin: 0 0 24px; display: flex; flex-direction: column; gap: 12px; font-size: 13px; font-weight: 600; color: ${isDark ? '#cbd5e1' : '#334155'}; }
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
          background: ${isDark ? 'rgba(30,41,59,.8)' : 'rgba(255,255,255,.95)'};
          border: 1.5px solid ${isDark ? '#334155' : '#e2e8f0'};
          color: ${isDark ? '#f8fafc' : '#0f172a'};
        }
        .hp-price-btn-sec:hover { border-color: #4f46e5; color: #4f46e5; }

        /* ── Footer ── */
        .hp-footer {
          position: relative;
          z-index: 10;
          border-top: 1px solid ${isDark ? '#1e293b' : 'rgba(226,232,240,.9)'};
          padding: 24px 56px;
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        @media (max-width: 900px) {
          .hp-footer { padding: 20px 24px; flex-direction: column; gap: 12px; text-align: center; }
        }
      `}</style>

      <div className="hp-page">
        <div className="hp-blob hp-blob-1" />
        <div className="hp-blob hp-blob-2" />
        <div className="hp-blob hp-blob-3" />

        {/* ── Hero Section ─────────────────────────────────── */}
        <div className="hp-hero-wrap">
          <div className="hp-hero-grid">

            {/* Left Column: Headline & Action Buttons */}
            <div className="hp-left">
              <div className="hp-eyebrow">
                <div className="hp-eyebrow-dot" />
                <span className="hp-eyebrow-text">Sigmavalue AI Pilot Platform</span>
              </div>

              <h1 className="hp-title">
                Autonomous AI Agents for <span>Real Estate Intelligence</span>
              </h1>

              <p className="hp-subtitle">
                Orchestrate AI agents for automated property valuation, spatial GIS intelligence, MahaRERA project compliance, construction feasibility, and market analytics.
              </p>

              <div className="hp-cta-row">
                <Link href={user ? "/valuation" : "/auth"} className="hp-btn-primary">
                  <Bot style={{ width: 18, height: 18 }} />
                  {user ? "Open Valuation Agent" : "Launch AI Pilot Free"}
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </Link>

                <a href="#super-agent-section" className="hp-btn-secondary">
                  <Sparkles style={{ width: 16, height: 16, color: '#7c3aed' }} />
                  Explore Super Agent
                </a>
              </div>

              {/* Micro Metrics Row */}
              <div className="hp-stats-row">
                {STATS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="hp-stat-pill">
                      <Icon style={{ width: 14, height: 14 }} className={s.color} />
                      <span className="hp-stat-value">{s.value}</span>
                      <span className="hp-stat-label">{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Interactive Illustration */}
            <div className="hp-right">
              <div className="hp-illus-card">
                <div className="hp-illus-header">
                  <div style={{ display: 'flex', itemsCenter: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4f46e5' }} />
                    <span style={{ fontSize: 12, fontWeight: 800 }}>
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
                  <div style={{ background: isDark ? '#1e293b' : '#f8fafc', padding: 12, borderRadius: 14, border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase' }}>Avg Rate / sqft</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: isDark ? '#f8fafc' : '#0f172a', marginTop: 2 }}>₹ 14,250</div>
                  </div>
                  <div style={{ background: isDark ? '#1e293b' : '#f8fafc', padding: 12, borderRadius: 14, border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase' }}>Location Index</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#4f46e5', marginTop: 2 }}>9.2 / 10</div>
                  </div>
                </div>

                {/* Floating badge 1 */}
                <div className="hp-float-card-1">
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <TrendingUp style={{ width: 16, height: 16 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800 }}>+12.4% YoY</div>
                    <div style={{ fontSize: 9, fontWeight: 600, opacity: 0.8 }}>Micro-market Growth</div>
                  </div>
                </div>

                {/* Floating badge 2 */}
                <div className="hp-float-card-2">
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <Bot style={{ width: 16, height: 16 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800 }}>AI Valuation Agent</div>
                    <div style={{ fontSize: 9, fontWeight: 600, opacity: 0.8 }}>Real-time Analysis</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Role Banner Section ───────────────────────────── */}
        {mounted && user && (
          <div className="hp-role-banner">
            <div className="hp-role-card">
              <div className="hp-role-left">
                <div className="hp-role-icon">
                  <Shield style={{ width: 20, height: 20 }} />
                </div>
                <div>
                  <div className="hp-role-greeting">
                    Welcome back, {user.username}
                  </div>
                  <div className="hp-role-sub">
                    {isAdmin
                      ? 'Administrator Access — You can access all specialized AI agents & Solution workspace.'
                      : 'Valuation Agent is enabled for your account. Other agents launching soon.'}
                  </div>
                </div>
              </div>
              <span className={`hp-role-badge ${isAdmin ? 'hp-role-badge-admin' : 'hp-role-badge-user'}`}>
                {isAdmin ? 'ADMINISTRATOR' : `${user.role} ACCOUNT`}
              </span>
            </div>
          </div>
        )}

        {/* ── Super Agent Section ───────────────────────────── */}
        <div id="super-agent-section" className="hp-super-agent">
          <div className="hp-super-card">
            <div className="hp-super-grid">
              {/* Left Column */}
              <div>
                <div className="hp-super-eyebrow">
                  <Sparkles style={{ width: 13, height: 13, color: '#a78bfa' }} />
                  <span className="hp-super-eyebrow-text">Sigmavalue Core Engine</span>
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
          <div className="hp-pricing-header">
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
              <div className="hp-price-val">₹0 <span style={{ fontSize: 13, fontWeight: 500, opacity: 0.7 }}>/ forever</span></div>
              <p className="hp-price-desc">Ideal for trying out the AI Valuation Agent &amp; basic location tools.</p>
              <hr style={{ border: 'none', borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, margin: '20px 0' }} />
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
              <div className="hp-price-name">1,000,000 Token Pack</div>
              <div className="hp-price-val">₹5,000 <span style={{ fontSize: 13, fontWeight: 500, opacity: 0.7 }}>/ one-time</span></div>
              <p className="hp-price-desc">High-volume token pack for professional real estate analysts &amp; firms.</p>
              <hr style={{ border: 'none', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,.1)' : '#e2e8f0'}`, margin: '20px 0' }} />
              <ul className="hp-price-list">
                <li><CheckCircle2 style={{ width: 16, height: 16, color: '#10b981' }} /> 1,000,000 High-Priority AI Tokens</li>
                <li><CheckCircle2 style={{ width: 16, height: 16, color: '#10b981' }} /> Instant Wallet Credit via Stripe</li>
                <li><CheckCircle2 style={{ width: 16, height: 16, color: '#10b981' }} /> Full Valuation Engine Access</li>
                <li><CheckCircle2 style={{ width: 16, height: 16, color: '#10b981' }} /> Never Expires • Pay As You Go</li>
              </ul>
              {isBuyDisabled ? (
                <div className="hp-price-btn" style={{ background: isDark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.05)', border: `1px solid ${isDark ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.1)'}`, opacity: 0.8, cursor: 'not-allowed', fontSize: 11 }}>
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
              <div className="hp-price-val">Custom <span style={{ fontSize: 13, fontWeight: 500, opacity: 0.7 }}>/ team</span></div>
              <p className="hp-price-desc">Tailored multi-seat workspaces, custom agent integration &amp; dedicated SLA.</p>
              <hr style={{ border: 'none', borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, margin: '20px 0' }} />
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
            <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              System Operational
            </span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            © 2026 Sigmavalue AI Corp
          </span>
        </footer>
      </div>
    </>
  );
}
