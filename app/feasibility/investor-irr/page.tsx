"use client";

import dynamic from 'next/dynamic';

const InvestorIRR = dynamic(() => import('@/components/feasibility_agent/InvestorIRR'), { ssr: false });

export default function InvestorIRRPage() {
  return <InvestorIRR />;
}
