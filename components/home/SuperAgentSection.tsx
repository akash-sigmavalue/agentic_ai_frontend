import { Sparkles } from 'lucide-react';

export default function SuperAgentSection() {
  return (
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
  );
}
