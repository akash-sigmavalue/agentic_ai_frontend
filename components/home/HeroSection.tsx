'use client';

import Link from 'next/link';
import { ArrowRight, Bot, CheckCircle2, Clock, Cpu, Globe, Sparkles, TrendingUp } from 'lucide-react';

const STATS = [
  { label: 'Valuation Engine', value: 'Active', icon: TrendingUp, color: 'text-emerald-500' },
  { label: 'AI Models', value: '3+', icon: Cpu, color: 'text-indigo-500' },
  { label: 'Data Sources', value: '20+', icon: Globe, color: 'text-sky-500' },
  { label: 'Avg Latency', value: '<2s', icon: Clock, color: 'text-amber-500' },
];

type HeroSectionProps = { hasUser: boolean; isDark: boolean };

export default function HeroSection({ hasUser, isDark }: HeroSectionProps) {
  return (
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
            <Link href={hasUser ? "/valuation" : "/auth"} className="hp-btn-primary">
              <Bot style={{ width: 18, height: 18 }} />
              {hasUser ? "Open Valuation Agent" : "Launch AI Pilot Free"}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
  );
}
