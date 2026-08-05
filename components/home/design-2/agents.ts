import { BarChart3, Building2, Calculator, FileText, MapPinned, RadioTower, RefreshCcw, Scale } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type CortexAgent = {
  key: string;
  name: string;
  kicker: string;
  title: string;
  summary: string;
  icon: LucideIcon;
  color: string;
  position: string;
};

export const CORTEX_AGENTS: CortexAgent[] = [
  { key: 'valuation', name: 'Valuation Agent', kicker: 'Valuation signal', title: 'Instant property value synthesis', summary: 'Combining property attributes, visual condition, location intelligence and comparable evidence.', icon: Building2, color: '#17bd84', position: 'left-[39%] top-[3%]' },
  { key: 'gis', name: 'Land & GIS Agent', kicker: 'Spatial intelligence', title: 'The parcel becomes a living map', summary: 'Verifying boundaries with satellite, cadastral and master-plan intelligence.', icon: MapPinned, color: '#23c7b5', position: 'left-[2%] top-[17%]' },
  { key: 'market', name: 'Market Research Agent', kicker: 'Market signal', title: 'Demand and competition in motion', summary: 'Synthesizing demand, supply, absorption, pricing and positioning.', icon: BarChart3, color: '#ff9342', position: 'right-[2%] top-[14%]' },
  { key: 'physical', name: 'Physical AI Agent', kicker: 'Visual site signal', title: 'A continuously observed digital twin', summary: 'Reading imagery, video, drone footage and BIM construction data.', icon: RadioTower, color: '#8d69ff', position: 'right-[1%] top-[35%]' },
  { key: 'feasibility', name: 'Feasibility Agent', kicker: 'Development signal', title: 'The highest-value project strategy', summary: 'Comparing configurations, revenue potential, returns and risk.', icon: Calculator, color: '#ed5bb9', position: 'right-[3%] top-[56%]' },
  { key: 'document', name: 'Document Intelligence', kicker: 'Document signal', title: 'Documents become structured intelligence', summary: 'Extracting clauses, interpreting plans and detecting inconsistencies.', icon: FileText, color: '#3a9bff', position: 'right-[12%] bottom-[3%]' },
  { key: 'live', name: 'Live Data Intelligence', kicker: 'Open-web signal', title: 'A live real-estate knowledge network', summary: 'Discovering and verifying changing market signals from the web.', icon: RadioTower, color: '#3f80ff', position: 'left-[3%] bottom-[5%]' },
  { key: 'transaction', name: 'Transaction Intelligence', kicker: 'Transaction signal', title: 'Millions of deals become one answer', summary: 'Matching comparables and discovering transaction price patterns.', icon: RefreshCcw, color: '#f4b71d', position: 'left-[38%] bottom-0' },
  { key: 'legal', name: 'Legal Intelligence', kicker: 'Compliance signal', title: 'Legal risk made visible', summary: 'Interpreting approvals and clauses to surface evidence-linked risk.', icon: Scale, color: '#8a64ff', position: 'left-[1%] top-[51%]' },
];
