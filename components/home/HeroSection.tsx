'use client';

import Link from 'next/link';
import { ArrowRight, Bot, Clock, Cpu, Globe, Sparkles, TrendingUp } from 'lucide-react';

const STATS = [
  { label: 'Property Owners', value: '500+', icon: TrendingUp, color: 'text-emerald-500' },
  { label: 'Valuation Time', value: '2 Mins', icon: Clock, color: 'text-amber-500' },
  { label: 'Data Sources', value: '20+', icon: Globe, color: 'text-sky-500' },
  { label: 'AI Powered', value: 'Free', icon: Cpu, color: 'text-indigo-500' },
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
            <span className="hp-eyebrow-text">Discover Your Property's True Worth</span>
          </div>

          <h1 className="hp-title">
            Get Property Valuation in <br />
            <span>2 Mins</span>
          </h1>

          <p className="hp-subtitle">
            Want to buy a property at the right value? SigmaValue helps home buyers with AI-powered insights. Instantly access easy-to-understand reports featuring local sale transactions, price trends, and market analysis.
          </p>

          <div className="hp-cta-row">
            <Link href={hasUser ? "/valuation" : "/auth"} className="hp-btn-primary">
              <Bot style={{ width: 18, height: 18 }} />
              Get Valuation
              <ArrowRight style={{ width: 16, height: 16 }} />
            </Link>

            <Link href="/pricing" className="hp-btn-secondary">
              <Sparkles style={{ width: 16, height: 16, color: '#7c3aed' }} />
              Get Instant Property Valuation @ 99
            </Link>
          </div>

          {/* Trust line */}
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
            Get verified AI-driven valuation reports trusted by 500+ property owners.
          </p>

          {/* How It Works */}
          <div style={{
            marginTop: 24,
            background: isDark
              ? 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)'
              : 'linear-gradient(135deg, #eef2ff 0%, #f0f9ff 100%)',
            borderRadius: 20,
            padding: '20px 24px 14px',
            border: `1px solid ${isDark ? '#312e81' : '#e0e7ff'}`,
          }}>
            <p style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: isDark ? '#e2e8f0' : '#1e293b', marginBottom: 20 }}>
              How It Works
            </p>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>

              {/* Step 1 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 10 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: isDark ? '#1e293b' : '#fff', boxShadow: isDark ? '0 2px 12px rgba(99,102,241,0.25)' : '0 2px 8px rgba(79,70,229,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#e2e8f0' : '#1e293b' }}>Enter Details</div>
                  <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>Location, size &amp; type</div>
                </div>
              </div>

              <div style={{ flex: '0 0 32px', height: 2, background: isDark ? 'linear-gradient(90deg, #4338ca, #3730a3)' : 'linear-gradient(90deg, #c7d2fe, #bfdbfe)', borderRadius: 2, marginTop: 24 }} />

              {/* Step 2 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 10 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: isDark ? '#1e293b' : '#fff', boxShadow: isDark ? '0 2px 12px rgba(99,102,241,0.25)' : '0 2px 8px rgba(79,70,229,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#e2e8f0' : '#1e293b' }}>AI Analysis</div>
                  <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>Market data &amp; trends</div>
                </div>
              </div>

              <div style={{ flex: '0 0 32px', height: 2, background: isDark ? 'linear-gradient(90deg, #4338ca, #3730a3)' : 'linear-gradient(90deg, #c7d2fe, #bfdbfe)', borderRadius: 2, marginTop: 24 }} />

              {/* Step 3 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 10 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: isDark ? '#1e293b' : '#fff', boxShadow: isDark ? '0 2px 12px rgba(99,102,241,0.25)' : '0 2px 8px rgba(79,70,229,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#e2e8f0' : '#1e293b' }}>Get Report</div>
                  <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', marginTop: 2, lineHeight: 1.4 }}>Detailed Insights based on verified transaction data</div>
                </div>
              </div>

            </div>

            <p style={{ fontSize: 11, color: isDark ? '#64748b' : '#64748b', marginTop: 16, paddingTop: 12, borderTop: `1px solid ${isDark ? '#312e81' : '#e0e7ff'}` }}>
              *Trusted by Valuers, Developers, Banks and Home Buyers across India
            </p>
          </div>


        </div>

        {/* Right Column: Hero Illustration */}
        <div className="hp-right" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 520 }}>
            {/* Glow backdrop */}
            <div style={{
              position: 'absolute',
              inset: '-10%',
              background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.18) 0%, transparent 70%)',
              borderRadius: '50%',
              pointerEvents: 'none',
              filter: 'blur(24px)',
            }} />
            <img
              src="/hero_real_estate_ai.png"
              alt="AI-powered real estate valuation illustration"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                position: 'relative',
                animation: 'heroFloat 4s ease-in-out infinite',
                filter: isDark ? 'brightness(0.9) drop-shadow(0 8px 32px rgba(99,102,241,0.25))' : 'drop-shadow(0 8px 32px rgba(99,102,241,0.15))',
              }}
            />
            <style>{`
              @keyframes heroFloat {
                0%, 100% { transform: translateY(0px); }
                50%       { transform: translateY(-12px); }
              }
            `}</style>
          </div>
        </div>

      </div>
    </div>
  );
}
