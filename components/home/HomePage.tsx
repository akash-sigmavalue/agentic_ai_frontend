'use client';

import React, { useSyncExternalStore } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import HeroSection from './HeroSection';
import HomeBackground from './HomeBackground';
import HomeFooter from './HomeFooter';
import PricingSection from './PricingSection';
import RoleBanner from './RoleBanner';
import SuperAgentSection from './SuperAgentSection';

export default function HomePage() {
  const { user } = useAuth();
  const isDark = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

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
        .hp-page {
          min-height: 100vh;
          background: ${isDark
            ? 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #090d16 100%)'
            : 'linear-gradient(135deg, #f0f4ff 0%, #fafbff 45%, #f5f0ff 100%)'};
          color: ${isDark ? '#f8fafc' : '#0f172a'};
          font-family: inherit;
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
        <HomeBackground />

        {/* ── Hero Section ─────────────────────────────────── */}
        <HeroSection hasUser={Boolean(user)} isDark={isDark} />
        <RoleBanner mounted={mounted} user={user} isAdmin={isAdmin} />
        <SuperAgentSection isDark={isDark} />
        <PricingSection
          disabledNotice={disabledNotice}
          hasUser={Boolean(user)}
          isBuyDisabled={isBuyDisabled}
          isDark={isDark}
        />
        <HomeFooter isDark={isDark} />
      </div>
    </>
  );
}
