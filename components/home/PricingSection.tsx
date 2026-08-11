'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, Shield, Zap } from 'lucide-react';

type PricingSectionProps = { disabledNotice: string; hasUser: boolean; isBuyDisabled: boolean; isDark: boolean };

export default function PricingSection({ disabledNotice, hasUser, isBuyDisabled, isDark }: PricingSectionProps) {
  return (
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
      <Link href={hasUser ? "/valuation" : "/auth"} className="hp-price-btn hp-price-btn-sec">
      {hasUser ? "Go to Valuation Agent" : "Get Started Free"}
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
  );
}
