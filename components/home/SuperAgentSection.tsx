'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AppWindow,
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  Calculator,
  ChevronLeft,
  ChevronRight,
  FileText,
  Home,
  Lightbulb,
  MapPinned,
  Megaphone,
  MessagesSquare,
  PieChart,
  PlugZap,
  RadioTower,
  RefreshCcw,
  Scale,
  Sparkles,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

type Agent = {
  name: string;
  description: string;
  capabilities: string[];
  cta: string;
  icon: LucideIcon;
  iconClass: string;
  position: string;
};

const AGENTS: Agent[] = [
  { name: 'Valuation Agent', description: 'Get an instant, data-backed valuation of any property using property details, images, location intelligence and comparable market evidence.', capabilities: ['Property valuation', 'Image-based assessment', 'Comparable finder', 'Map-based analysis', 'Valuation models'], cta: 'Open Valuation Agent →', icon: Building2, iconClass: 'bg-emerald-500/15 text-emerald-500', position: 'left-[49%] top-5 -translate-x-1/2' },
  { name: 'Land & GIS Agent', description: 'Explore any land parcel through prompt-based mapping, multi-layer spatial analysis and interactive visualization.', capabilities: ['Identify land parcels', 'Verify boundaries', 'Satellite, cadastral and master-plan overlays', 'Analyse surroundings', '2D and 3D site visualization'], cta: 'Explore Land & GIS Agent →', icon: MapPinned, iconClass: 'bg-teal-500/15 text-teal-500', position: 'left-[31%] top-[17%] -translate-x-1/2' },
  { name: 'Market Research Agent', description: 'Generate structured real estate insights, market trends and actionable recommendations using integrated data and analytics.', capabilities: ['Micro-market analysis', 'Demand–supply trends', 'Pricing and absorption insights', 'Competitor benchmarking', 'Buyer profiling', 'Growth and risk assessment', 'Market forecasting', 'Automated reports', 'Product mix analysis', 'Investment opportunity identification'], cta: 'Explore Market Research Agent →', icon: BarChart3, iconClass: 'bg-orange-500/15 text-orange-500', position: 'right-[6%] top-[15%]' },
  { name: 'Physical AI Agent', description: 'Monitor construction sites using images, videos, drone footage and BIM data to detect progress and completed work.', capabilities: ['Construction progress tracking', 'Work-completion assessment', 'Image and video analysis', 'Drone-site monitoring', 'Asset and project monitoring'], cta: 'Explore Physical AI Agent →', icon: RadioTower, iconClass: 'bg-violet-500/15 text-violet-500', position: 'right-0 top-[34%]' },
  { name: 'Feasibility Agent', description: 'Compare multiple development possibilities to determine the most viable land use, project configuration and financial strategy.', capabilities: ['Land potential assessment', 'Highest and Best Use analysis', 'Project configuration optimization', 'Revenue and return forecasting', 'Risk assessment', 'Investment recommendations'], cta: 'Simulate Project Feasibility →', icon: Calculator, iconClass: 'bg-pink-500/15 text-pink-500', position: 'right-0 top-[53%]' },
  { name: 'Document Intelligence Agent', description: 'Convert complex agreements, construction plans and property documents into AI-powered, decision-ready intelligence.', capabilities: ['Multimodal document analysis', 'Clause intelligence', 'Plan interpretation', 'Risk detection', 'Cross-document validation', 'Automated insights'], cta: 'Extract Document Insights →', icon: FileText, iconClass: 'bg-blue-500/15 text-blue-500', position: 'right-[1%] top-[73%]' },
  { name: 'Live Data Intelligence Agent', description: 'Transform the open web into a live, AI-powered real estate knowledge network.', capabilities: ['Autonomous web discovery', 'Real-time signal detection', 'Market monitoring', 'Data structuring', 'Cross-source verification', 'Intelligence synthesis'], cta: 'Activate Web Intelligence →', icon: RadioTower, iconClass: 'bg-blue-600/15 text-blue-500', position: 'left-[33%] bottom-2 -translate-x-1/2' },
  { name: 'Transaction Intelligence Agent', description: 'Transform millions of property transactions into instant, AI-powered market intelligence.', capabilities: ['Conversational data exploration', 'Intelligent comparable matching', 'Price-pattern detection', 'Geospatial transaction analysis', 'Market-trend discovery', 'Decision-ready outputs'], cta: 'Unlock Transaction Intelligence →', icon: RefreshCcw, iconClass: 'bg-amber-500/15 text-amber-500', position: 'left-[54%] bottom-0 -translate-x-1/2' },
  { name: 'Legal Intelligence Agent', description: 'Interpret property laws, regulations and legal documents to identify compliance requirements, obligations and potential risks.', capabilities: ['Title and ownership checks', 'Agreement and clause analysis', 'Regulatory compliance', 'Approval verification', 'Legal-risk detection', 'Evidence-linked insights'], cta: 'Explore Legal Intelligence →', icon: Scale, iconClass: 'bg-violet-600/15 text-violet-500', position: 'right-[10%] bottom-0' },
  { name: 'Generative Interface Agent', description: 'Transforms every real estate question into a personalised, interactive decision workspace.', capabilities: ['Real-time UI generation', 'Role-based workspaces', 'Dynamic dashboards', 'Multi-agent output integration', 'Interactive simulations', 'Digital twins', 'Voice and spatial interfaces'], cta: 'Explore Generative Interface →', icon: AppWindow, iconClass: 'bg-fuchsia-500/15 text-fuchsia-500', position: '' },
  { name: 'Autonomous Relationship Agent', description: 'A self-learning real estate growth agent that identifies who is likely to buy, what they are likely to buy, and when they may act—and autonomously determines the next best action to move each relationship toward closure.', capabilities: ['Buyer digital twins', 'Intent and emotion detection', 'Next-best-action prediction', 'Autonomous property matching', 'Hyper-personalised sales journeys', 'Conversion simulation', 'Dynamic offer recommendations', 'Relationship memory', 'AI-led negotiation support', 'Dormant-lead revival', 'Multi-agent sales orchestration'], cta: 'Explore Autonomous CRM →', icon: Users, iconClass: 'bg-rose-500/15 text-rose-500', position: '' },
  { name: 'Autonomous Real Estate ERP Agent', description: 'An intelligent operating agent that connects every project, department, resource and financial transaction—then autonomously identifies delays, cost overruns, workflow gaps and actions required to keep the organisation on track.', capabilities: ['Organisational digital twin', 'Cross-department workflow orchestration', 'Predictive cost and schedule control', 'Autonomous resource allocation', 'Procurement intelligence', 'Cash-flow forecasting', 'Approval and compliance tracking', 'Vendor-performance prediction', 'Inventory synchronisation', 'Exception-based decision-making'], cta: 'Activate your ERP Assistant →', icon: Briefcase, iconClass: 'bg-indigo-500/15 text-indigo-500', position: '' },
  { name: 'Portfolio Management agent', description: 'An autonomous portfolio agent that continuously evaluates every asset, anticipates market movements and recommends where to invest, hold, refinance or exit.', capabilities: ['Predictive valuation', 'Opportunity detection', 'Exit-timing intelligence', 'Scenario simulation', 'Risk alerts', 'Autonomous portfolio rebalancing'], cta: 'Activate Autonomous Portfolio Management →', icon: PieChart, iconClass: 'bg-cyan-500/15 text-cyan-500', position: '' },
  { name: 'Connector Agent', description: 'Connects Gmail, Drive, ERP, CRM, project platforms and APIs to execute communication and workflows across systems based on user intent.', capabilities: ['External-system integration', 'Intent-driven communication', 'Cross-platform data retrieval', 'Email and document workflows', 'Automated task creation', 'Real-time data synchronisation', 'Multi-system workflow orchestration'], cta: 'Connect and Orchestrate Your Organisation →', icon: PlugZap, iconClass: 'bg-yellow-500/15 text-yellow-500', position: '' },
  { name: 'Collaborator Agent', description: 'Transforms user intent into coordinated team workflows by assigning tasks, sharing context, tracking responses and managing follow-ups.', capabilities: ['Task assignment', 'Team communication', 'Follow-up reminders', 'Progress tracking', 'Team coordination', 'Issue escalation', 'Meeting summaries', 'Action tracking'], cta: 'Collaborate Smarter →', icon: MessagesSquare, iconClass: 'bg-sky-500/15 text-sky-500', position: '' },
  { name: 'Property Management Agent', description: 'Transforms every property into a continuously monitored, self-managing asset—anticipating maintenance, coordinating tenants and vendors, controlling costs and protecting long-value.', capabilities: ['Predictive maintenance', 'Tenant support', 'Rent and lease tracking', 'Vendor coordination', 'Expense monitoring', 'Utility optimisation', 'Compliance alerts', 'Automated issue resolution', 'Asset-performance insights'], cta: 'Activate Your Self-Managing Property →', icon: Home, iconClass: 'bg-lime-500/15 text-lime-500', position: '' },
  { name: 'Marketing & Sales Agent', description: 'Identifies the right buyers, creates personalised campaigns and coordinates every sales interaction—from initial discovery to property booking.', capabilities: ['Buyer segmentation', 'Campaign creation', 'Lead generation', 'Intent analysis', 'Property recommendations', 'Lead prioritisation', 'Personalised follow-ups', 'Conversion tracking', 'Sales forecasting'], cta: 'Turn Property Interest into Sales →', icon: Megaphone, iconClass: 'bg-red-500/15 text-red-500', position: '' },
  { name: 'Value Creation Agent', description: 'Continuously identifies actions that can increase the value, income and commercial potential of any land, property, project or portfolio.', capabilities: ['Highest-and-best-use discovery', 'Redevelopment potential', 'Rental enhancement', 'Space-use optimisation', 'Approval and FSI opportunities', 'Renovation recommendations', 'Pricing improvement', 'Refinancing and exit strategies'], cta: 'Discover Your Property’s Untapped Value →', icon: Lightbulb, iconClass: 'bg-amber-600/15 text-amber-500', position: '' },
];

const ACTIVE_AGENT_NAMES = new Set([
  'Valuation Agent',
  'Land & GIS Agent',
  'Market Research Agent',
  'Feasibility Agent',
  'Document Intelligence Agent',
  'Transaction Intelligence Agent',
  'Portfolio Management agent',
  'Connector Agent',
]);

type SuperAgentSectionProps = {
  isDark?: boolean;
};

export default function SuperAgentSection({ isDark: propIsDark }: SuperAgentSectionProps = {}) {
  const systemIsDark = useTheme();
  const isDark = propIsDark !== undefined ? propIsDark : systemIsDark;

  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isHovered, setIsHovered] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isAutoplay, setIsAutoplay] = useState(true);
  const [expandedCapabilitiesAgentIndex, setExpandedCapabilitiesAgentIndex] = useState<number | null>(null);

  const total = AGENTS.length;
  const areCapabilitiesExpanded = expandedCapabilitiesAgentIndex === activeIndex;

  const handlePrev = useCallback(() => setActiveIndex((i) => (i - 1 + total) % total), [total]);
  const handleNext = useCallback(() => setActiveIndex((i) => (i + 1) % total), [total]);
  const handleAgentSelect = useCallback((index: number) => {
    setIsAutoplay(false);
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    if (isHovered || !isAutoplay) return;
    const interval = setInterval(handleNext, 4500);
    return () => clearInterval(interval);
  }, [isHovered, isAutoplay, handleNext]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext]);

  const pillRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pillContainerRef = useRef<HTMLDivElement | null>(null);

  // Center the active mobile pill without scrolling the page viewport horizontally.
  useEffect(() => {
    const container = pillContainerRef.current;
    const activePill = pillRefs.current[activeIndex];
    if (container && activePill) {
      container.scrollTo({
        left: activePill.offsetLeft - (container.clientWidth - activePill.offsetWidth) / 2,
        behavior: 'smooth',
      });
    }
  }, [activeIndex]);

  // Throttled mouse-wheel handler — scrolling the section rotates the orbit
  const lastWheelTime = useRef(0);
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheelTime.current < 600) return; // throttle: one step per 600 ms
      lastWheelTime.current = now;
      if (e.deltaY > 0 || e.deltaX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    },
    [handleNext, handlePrev]
  );

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) handleNext();
    if (distance < -50) handlePrev();
  };

  const activeAgent = AGENTS[activeIndex];
  const isActiveAgentAvailable = ACTIVE_AGENT_NAMES.has(activeAgent.name);
  const ActiveIcon = activeAgent.icon;

  return (
    <div
      id="super-agent-orbit"
      className={`relative overflow-x-hidden transition-colors duration-300 font-sans box-border [&_*]:box-border ${
        isDark ? 'bg-[#04091d] text-[#f7f8ff]' : 'bg-transparent text-slate-900'
      }`}
    >
      {/* Background gradients */}
      <div
        className={`pointer-events-none absolute inset-0 z-0 transition-opacity duration-300 ${
          isDark
            ? 'bg-[radial-gradient(circle_at_50%_43%,rgba(84,61,255,0.22),transparent_27rem),radial-gradient(circle_at_50%_100%,rgba(26,20,110,0.28),transparent_38rem)]'
            : 'bg-[radial-gradient(circle_at_50%_43%,rgba(99,102,241,0.08),transparent_27rem),radial-gradient(circle_at_50%_100%,rgba(199,210,254,0.18),transparent_38rem)]'
        }`}
      />
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-20 transition-opacity duration-300"
        style={{
          backgroundImage: isDark
            ? 'radial-gradient(circle,rgba(92,116,255,0.9) 1px,transparent 1px)'
            : 'radial-gradient(circle,rgba(99,102,241,0.35) 1px,transparent 1px)',
          backgroundSize: '32px 32px',
          WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 75%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, #000 0%, #000 75%, transparent 100%)',
        }}
      />

      {/* Main Container */}
      <main className="relative z-10 mx-auto w-[min(1600px,100%)]  pb-[20px] pt-[28px] max-md:px-[12px] max-md:pb-[16px] max-md:pt-[22px]">
        {/* ── SINGLE IMMERSIVE STAGE ── */}
        <section
          className="relative mt-[6px] h-[880px] max-lg:h-[840px] max-md:mt-[6px] max-md:h-auto max-md:flex max-md:flex-col max-md:items-center max-md:gap-4 overflow-hidden select-none outline-none focus-visible:-outline-offset-4 focus-visible:rounded-[24px] focus-visible:outline-[2px_solid_#836dff]"
          style={{ perspective: '1400px', touchAction: 'pan-y' }}
          tabIndex={0}
          aria-roledescription="carousel"
          aria-label="AI agent carousel"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEndHandler}
          onWheel={handleWheel}
        >
          {/* ── 3D PERSPECTIVE ORBIT STAGE ── */}
          <div
            className="absolute left-1/2 top-[4%] z-[1] h-[min(520px,58vw)] w-[min(960px,94vw)] -translate-x-1/2 max-md:relative max-md:left-0 max-md:top-0 max-md:translate-x-0 max-md:h-[260px] max-md:w-full"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* ── 3D Tilted Floor Base Plane ── */}
            <div
              className="absolute inset-0 rounded-full transition-transform duration-700 max-md:opacity-70"
              style={{
                transformStyle: 'preserve-3d',
                transform: 'rotateX(56deg)',
              }}
            >
              {/* Concentric 3D Orbit Rings */}
              <div
                className={`absolute inset-0 rounded-full border transition-colors duration-300 ${
                  isDark
                    ? 'border-[rgba(120,100,255,0.35)] shadow-[0_0_140px_rgba(76,54,255,0.22),inset_0_0_120px_rgba(48,37,172,0.18)]'
                    : 'border-[rgba(99,102,241,0.28)] shadow-[0_0_140px_rgba(99,102,241,0.14),inset_0_0_120px_rgba(199,210,254,0.15)]'
                }`}
              >
                <div
                  className={`absolute inset-[8%] rounded-full border border-dashed ${
                    isDark ? 'border-[rgba(58,190,255,0.25)]' : 'border-[rgba(99,102,241,0.20)]'
                  }`}
                />
                <div
                  className={`absolute inset-[18%] rounded-full border ${
                    isDark ? 'border-[rgba(140,120,255,0.18)]' : 'border-[rgba(99,102,241,0.12)]'
                  }`}
                />
                <div
                  className={`absolute inset-[30%] rounded-full border border-dashed ${
                    isDark ? 'border-[rgba(160,130,255,0.12)]' : 'border-[rgba(99,102,241,0.10)]'
                  }`}
                />
              </div>

              {/* 3D Floor Grid Radial Glow */}
              <div
                className={`absolute inset-[15%] rounded-full blur-[24px] ${
                  isDark
                    ? 'bg-[radial-gradient(circle_at_50%_50%,rgba(92,70,255,0.22),transparent_70%)]'
                    : 'bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.12),transparent_70%)]'
                }`}
              />

              {/* Network lines – SVG on 3D tilted plane */}
              <svg className="absolute inset-0 h-full w-full opacity-40 max-md:opacity-[0.15] pointer-events-none" aria-hidden="true" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={isDark ? 'rgba(130, 110, 255, 0.60)' : 'rgba(99, 102, 241, 0.45)'} />
                    <stop offset="90%" stopColor="transparent" />
                  </linearGradient>
                </defs>
                {AGENTS.map((_, idx) => {
                  const offsetIdx = (idx - activeIndex + total) % total;
                  const angleDeg = 90 + (offsetIdx * (360 / total));
                  const rad = (angleDeg * Math.PI) / 180;
                  const x = 50 + Math.cos(rad) * 46;
                  const y = 50 + Math.sin(rad) * 46;
                  return (
                    <line
                      key={`line-${idx}`}
                      x1="50%" y1="50%" x2={`${x}%`} y2={`${y}%`}
                      stroke="url(#lineGrad)" strokeWidth="1.2"
                      strokeDasharray="4 4"
                      className="transition-all duration-500 ease-in-out"
                    />
                  );
                })}
              </svg>
            </div>

            {/* ── ENLARGED 3D STANDING CENTRAL BUILDING ── */}
            <div
              className="absolute left-1/2 top-1/2 z-[40] w-[62%] max-md:w-[85%] -translate-x-1/2 -translate-y-[52%] max-md:-translate-y-[50%] pointer-events-none"
              aria-hidden="true"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Primary deep glow behind building */}
              <div
                className={`absolute inset-[10%_0%_4%] -z-10 rounded-full blur-[44px] ${
                  isDark
                    ? 'bg-[radial-gradient(ellipse,rgba(96,72,255,0.90),transparent_60%)]'
                    : 'bg-[radial-gradient(ellipse,rgba(99,102,241,0.45),transparent_60%)]'
                }`}
              />
              {/* Wide ambient haze */}
              <div
                className={`absolute inset-[-18%] -z-10 rounded-full blur-[75px] ${
                  isDark
                    ? 'bg-[radial-gradient(ellipse,rgba(50,30,185,0.45),transparent_55%)]'
                    : 'bg-[radial-gradient(ellipse,rgba(165,180,252,0.30),transparent_55%)]'
                }`}
              />
              {/* 3D Isometric floor glow disc */}
              <div
                className={`absolute bottom-[4%] left-1/2 -z-10 h-[16%] w-[60%] -translate-x-1/2 rounded-full blur-[30px] ${
                  isDark ? 'bg-[rgba(90,65,255,0.65)]' : 'bg-[rgba(99,102,241,0.35)]'
                }`}
              />
              <img
                className={`block w-full rounded-[34%_34%_12%_12%] saturate-[1.18] transition-all duration-300 ${
                  isDark
                    ? 'mix-blend-screen drop-shadow-[0_45px_100px_rgba(62,44,255,0.60)]'
                    : 'mix-blend-multiply drop-shadow-[0_20px_50px_rgba(79,70,229,0.25)]'
                }`}
                style={{
                  maskImage: 'radial-gradient(ellipse at 50% 52%, #000 58%, transparent 86%)',
                  WebkitMaskImage: 'radial-gradient(ellipse at 50% 52%, #000 58%, transparent 86%)',
                }}
                alt=""
                src="/images/super-agent-building.png"
              />
              {/* Central Node badge */}
              <div
                className={`absolute bottom-[6%] left-1/2 flex -translate-x-1/2 items-center gap-[7px] whitespace-nowrap rounded-full px-[13px] py-[7px] text-[11px] font-[750] transition-colors duration-300 max-md:hidden ${
                  isDark
                    ? 'border border-[rgba(141,122,255,0.50)] bg-[rgba(7,13,42,0.92)] text-[#d4d0ff] shadow-[0_4px_20px_rgba(80,55,255,0.3)]'
                    : 'border border-[#c7d2fe] bg-white/95 text-[#4338ca] shadow-[0_4px_16px_rgba(79,70,229,0.12)]'
                }`}
              >
                <Sparkles className="h-[12px] w-[12px]" /> Central Node
              </div>
            </div>

            {/* ── 3D Orbiting Mini-Cards ── */}
            {AGENTS.map((agent, idx) => {
              const isActive = idx === activeIndex;
              const offsetIdx = (idx - activeIndex + total) % total;
              const angleDeg = 90 + (offsetIdx * (360 / total));
              const rad = (angleDeg * Math.PI) / 180;

              const x = 50 + Math.cos(rad) * 46;
              const y = 50 + Math.sin(rad) * 36;
              const AgentIcon = agent.icon;

              const sinVal = Math.sin(rad);
              const isBehind = sinVal < 0;
              const zDepth = Math.round(sinVal * 120);
              const scale = isBehind ? 0.72 + (sinVal + 1) * 0.12 : 0.88 + sinVal * 0.14;
              const zIndex = isBehind ? Math.floor(20 + sinVal * 10) : Math.floor(45 + sinVal * 20);

              return (
                <button
                  key={`mini-${idx}`}
                  type="button"
                  aria-label={`Show ${agent.name}`}
                  className={`max-md:hidden absolute flex min-h-[66px] w-[164px] max-lg:w-[154px] cursor-pointer items-start gap-[9px] rounded-[12px] p-[10px_11px] backdrop-blur-[14px] origin-center will-change-transform transition-all duration-300 ${
                    isDark
                      ? 'border border-[rgba(126,110,255,0.32)] bg-[linear-gradient(145deg,rgba(14,23,61,0.95),rgba(7,13,40,0.82))] text-[#f7f8ff] shadow-[0_14px_38px_rgba(0,0,0,0.35)] hover:border-[rgba(160,140,255,0.85)] hover:shadow-[0_18px_48px_rgba(0,0,0,0.45),0_0_26px_rgba(100,75,255,0.35)]'
                      : 'border border-[#c7d2fe] bg-white/90 text-slate-800 shadow-[0_10px_30px_rgba(79,70,229,0.10)] hover:border-indigo-400 hover:bg-white hover:shadow-[0_16px_40px_rgba(79,70,229,0.18)]'
                  }`}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: `translate(-50%, -50%) translateZ(${zDepth}px) scale(${scale})`,
                    opacity: isBehind ? 0.48 : 1,
                    pointerEvents: isActive ? 'none' : 'auto',
                    zIndex: zIndex,
                    transition: 'left 0.5s ease, top 0.5s ease, opacity 0.4s ease, transform 0.5s ease',
                  }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    handleAgentSelect(idx);
                  }}
                >
                  <div
                    className={`flex h-[30px] w-[30px] shrink-0 place-items-center justify-center rounded-[10px] ${
                      isDark
                        ? 'bg-[rgba(108,88,255,0.18)] text-white shadow-[inset_0_0_0_1px_rgba(144,127,255,0.18)]'
                        : 'bg-indigo-50 text-indigo-600 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.15)]'
                    }`}
                  >
                    <AgentIcon className="h-[14px] w-[14px]" />
                  </div>
                  <div className="min-w-0 flex-1 pt-[1px]">
                    <div className={`line-clamp-2 text-[10.5px] font-[800] leading-[1.18] ${isDark ? 'text-[#f4f5ff]' : 'text-slate-800'}`}>
                      {agent.name}
                    </div>
                    <div className={`mt-[5px] inline-flex whitespace-nowrap text-[8px] font-[850] tracking-[0.04em] ${
                      ACTIVE_AGENT_NAMES.has(agent.name)
                        ? isDark ? 'text-[#00ddb8]' : 'text-emerald-600'
                        : isDark ? 'text-amber-300' : 'text-amber-600'
                    }`}>
                      {ACTIVE_AGENT_NAMES.has(agent.name) ? '● ACTIVE' : '● IN DEVELOPMENT'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {/* ── End 3D orbit stage ── */}

          {/* ── Mobile Agent Quick Scroll Pills ── */}
          <div
            ref={pillContainerRef}
            className="hidden max-md:flex w-full max-w-full overflow-x-auto gap-2 py-2 px-1 scrollbar-none snap-x"
          >
            {AGENTS.map((agent, idx) => {
              const isActive = idx === activeIndex;
              const PillIcon = agent.icon;
              return (
                <button
                  key={`pill-${idx}`}
                  ref={(el) => { pillRefs.current[idx] = el; }}
                  onClick={() => handleAgentSelect(idx)}
                  className={`flex shrink-0 items-center gap-2 px-3 py-2 rounded-full border text-xs font-semibold transition-all snap-center ${
                    isActive
                      ? isDark
                        ? 'border-[#9484ff] bg-gradient-to-r from-[rgba(108,88,255,0.4)] to-[rgba(146,124,255,0.3)] text-white shadow-[0_0_16px_rgba(120,100,255,0.4)]'
                        : 'border-indigo-500 bg-gradient-to-r from-indigo-500/20 to-purple-500/15 text-indigo-700 font-bold shadow-sm'
                      : isDark
                      ? 'border-[rgba(120,100,255,0.2)] bg-[rgba(15,24,66,0.6)] text-[#9aa0bc]'
                      : 'border-slate-200 bg-white/90 text-slate-600'
                  }`}
                >
                  <PillIcon className="h-3.5 w-3.5" />
                  <span className="whitespace-nowrap">{agent.name}</span>
                  <span className={`whitespace-nowrap text-[8px] font-black tracking-[0.08em] ${
                    ACTIVE_AGENT_NAMES.has(agent.name)
                      ? isDark ? 'text-emerald-300' : 'text-emerald-600'
                      : isDark ? 'text-amber-300' : 'text-amber-600'
                  }`}>
                    {ACTIVE_AGENT_NAMES.has(agent.name) ? 'ACTIVE' : 'IN DEVELOPMENT'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Nav arrows ── */}
          <button
            className={`absolute left-[max(8px,1.5vw)] top-[38%] max-md:top-[130px] z-[150] flex h-[52px] w-[52px] max-md:h-[40px] max-md:w-[40px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-full transition-all duration-200 hover:scale-105 ${
              isDark
                ? 'border border-[rgba(139,122,255,0.6)] bg-[rgba(9,16,47,0.82)] text-[#d4d0ff] shadow-[0_0_30px_rgba(80,57,255,0.17)] hover:border-[#9e8cff] hover:text-white'
                : 'border border-[#c7d2fe] bg-white/90 text-indigo-700 shadow-[0_4px_20px_rgba(79,70,229,0.12)] hover:bg-[#4f46e5] hover:text-white'
            }`}
            onClick={handlePrev} aria-label="Previous agent"
          >
            <ChevronLeft className="h-[22px] w-[22px] max-md:h-[18px] max-md:w-[18px]" />
          </button>

          <button
            className={`absolute right-[max(8px,1.5vw)] top-[38%] max-md:top-[130px] z-[150] flex h-[52px] w-[52px] max-md:h-[40px] max-md:w-[40px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-full transition-all duration-200 hover:scale-105 ${
              isDark
                ? 'border border-[rgba(139,122,255,0.6)] bg-[rgba(9,16,47,0.82)] text-[#d4d0ff] shadow-[0_0_30px_rgba(80,57,255,0.17)] hover:border-[#9e8cff] hover:text-white'
                : 'border border-[#c7d2fe] bg-white/90 text-indigo-700 shadow-[0_4px_20px_rgba(79,70,229,0.12)] hover:bg-[#4f46e5] hover:text-white'
            }`}
            onClick={handleNext} aria-label="Next agent"
          >
            <ChevronRight className="h-[22px] w-[22px] max-md:h-[18px] max-md:w-[18px]" />
          </button>

          {/* ════════════════════════════════════════════════════════
              ACTIVE AGENT DETAIL CARD
          ════════════════════════════════════════════════════════ */}
          <div
            key={`card-${activeIndex}`}
            className={`absolute top-[78%] left-1/2 z-[100] w-[min(560px,calc(100%-64px))] max-md:relative max-md:top-0 max-md:left-0 max-md:translate-x-0 max-md:w-full rounded-[20px] p-0 text-left backdrop-blur-[22px] transition-all duration-300 ${
              isDark
                ? 'border border-[rgba(149,132,255,0.58)] bg-[radial-gradient(circle_at_20%_0%,rgba(102,81,255,0.20),transparent_55%),linear-gradient(150deg,rgba(15,24,66,0.96),rgba(5,10,35,0.97))] shadow-[0_24px_64px_rgba(0,0,0,0.60),0_0_36px_rgba(84,61,255,0.22),inset_0_1px_0_rgba(255,255,255,0.07)]'
                : 'border border-[rgba(99,102,241,0.35)] bg-[radial-gradient(circle_at_20%_0%,rgba(99,102,241,0.08),transparent_55%),linear-gradient(150deg,rgba(255,255,255,0.98),rgba(245,247,255,0.96))] shadow-[0_24px_64px_rgba(79,70,229,0.12),0_0_36px_rgba(99,102,241,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]'
            }`}
            style={{ animation: 'cardFadeUp 0.38s cubic-bezier(.22,.68,0,1.2) both' }}
          >
            <style>{`
              @keyframes cardFadeUp {
                from { opacity: 0; transform: translateX(-50%) translateY(calc(-50% + 14px)); }
                to   { opacity: 1; transform: translateX(-50%) translateY(-50%); }
              }
              @media (max-width: 767px) {
                @keyframes cardFadeUp {
                  from { opacity: 0; transform: translateY(14px); }
                  to   { opacity: 1; transform: translateY(0); }
                }
              }
            `}</style>

            {/* Card Header */}
            <div className={`flex items-center gap-[13px] border-b px-[20px] py-[15px] ${isDark ? 'border-[rgba(129,115,202,0.15)]' : 'border-slate-100'}`}>
              <div
                className={`flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[11px] ${
                  isDark
                    ? 'bg-[rgba(108,88,255,0.18)] text-[#c8c4ff] shadow-[inset_0_0_0_1px_rgba(144,127,255,0.24)]'
                    : 'bg-indigo-50 text-indigo-600 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.18)]'
                }`}
              >
                <ActiveIcon className="h-[20px] w-[20px]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={`m-0 text-[17px] max-md:text-[14px] font-bold leading-[1.2] tracking-[-0.01em] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {activeAgent.name}
                </h3>
                <div className={`mt-[3px] text-[9.5px] font-[700] uppercase tracking-[0.13em] ${isDark ? 'text-[#836dff]' : 'text-indigo-600'}`}>
                  Sigmavalue AI Agent
                </div>
              </div>
              <div
                className={`rounded-full border px-[10px] py-[4px] text-[10px] font-bold shrink-0 ${
                  isDark
                    ? 'border-[rgba(136,118,255,0.25)] bg-[rgba(119,99,255,0.12)] text-[#d7d3ff]'
                    : 'border-indigo-200 bg-indigo-50 text-indigo-700'
                }`}
              >
                {activeIndex + 1} / {total}
              </div>
            </div>

            {/* Description — 2 lines */}
            <div className="px-[20px] pt-[13px]">
              <p className={`line-clamp-2 text-[12.5px] max-md:text-[11.5px] leading-[1.68] ${isDark ? 'text-[#9aa0bc]' : 'text-slate-600'}`}>
                {activeAgent.description}
              </p>
            </div>

            {/* Capability chips */}
            <div className="flex flex-wrap gap-[6px] px-[20px] pt-[11px] pb-[14px]">
              <div id={`agent-capabilities-${activeIndex}`} className="contents">
                {activeAgent.capabilities
                  .slice(0, areCapabilitiesExpanded ? activeAgent.capabilities.length : 5)
                  .map((c, i) => (
                    <span
                      key={i}
                      className={`rounded-full border px-[9px] py-[4px] text-[10px] font-semibold transition-colors ${
                        isDark
                          ? 'border-[rgba(135,117,255,0.22)] bg-[rgba(116,98,255,0.10)] text-[#b8b4f0] hover:border-[rgba(135,117,255,0.48)] hover:bg-[rgba(116,98,255,0.20)]'
                          : 'border-indigo-200/80 bg-indigo-50/80 text-indigo-800 hover:border-indigo-300 hover:bg-indigo-100/70'
                      }`}
                    >
                      {c}
                    </span>
                  ))}
              </div>
              {activeAgent.capabilities.length > 5 && (
                <button
                  type="button"
                  aria-expanded={areCapabilitiesExpanded}
                  aria-controls={`agent-capabilities-${activeIndex}`}
                  onClick={() => {
                    setIsAutoplay(false);
                    setExpandedCapabilitiesAgentIndex((currentIndex) =>
                      currentIndex === activeIndex ? null : activeIndex
                    );
                  }}
                  className={`cursor-pointer rounded-full border px-[9px] py-[4px] text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                    isDark
                      ? 'border-[rgba(135,117,255,0.28)] text-[#a8afd2] hover:border-[rgba(135,117,255,0.48)] hover:bg-[rgba(116,98,255,0.16)]'
                      : 'border-slate-300 text-slate-500 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
                  }`}
                >
                  {areCapabilitiesExpanded
                    ? 'Show less'
                    : `+${activeAgent.capabilities.length - 5} more`}
                </button>
              )}
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-between gap-[10px] border-t px-[20px] py-[12px] ${isDark ? 'border-[rgba(129,115,202,0.14)]' : 'border-slate-100'}`}>
              <div className={`inline-flex items-center gap-[6px] text-[9px] font-[900] tracking-[0.1em] ${
                isActiveAgentAvailable
                  ? isDark ? 'text-[#08e0bc]' : 'text-emerald-600'
                  : isDark ? 'text-amber-300' : 'text-amber-600'
              }`}>
                <span className={`h-[6px] w-[6px] rounded-full ${
                  isActiveAgentAvailable
                    ? isDark ? 'bg-[#05deb9] shadow-[0_0_10px_rgba(5,222,185,0.90)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]'
                    : 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]'
                }`} />
                {isActiveAgentAvailable ? 'ACTIVE' : 'IN DEVELOPMENT'}
              </div>
              <button
                type="button"
                disabled={!isActiveAgentAvailable}
                className={`inline-flex items-center gap-[6px] rounded-[10px] px-[16px] py-[9px] text-[12px] font-bold text-white shadow-md transition-all ${
                  !isActiveAgentAvailable
                    ? 'cursor-not-allowed bg-slate-500/70 opacity-70'
                    : isDark
                    ? 'bg-gradient-to-br from-[#7660ff] to-[#9278ff] shadow-[0_6px_20px_rgba(104,82,255,0.38)] hover:shadow-[0_12px_28px_rgba(104,82,255,0.52)]'
                    : 'bg-gradient-to-br from-[#4f46e5] to-[#6366f1] shadow-[0_6px_20px_rgba(79,70,229,0.30)] hover:shadow-[0_12px_28px_rgba(79,70,229,0.45)]'
                }`}
              >
                {isActiveAgentAvailable ? 'Open agent →' : 'In development'}
              </button>
            </div>
          </div>
          {/* ── End active agent card ── */}

        </section>
      </main>
    </div>
  );
}
