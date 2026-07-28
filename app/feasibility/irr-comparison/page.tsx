"use client";

import dynamic from 'next/dynamic';

const IRRComparison = dynamic(() => import('@/components/feasibility_agent/IRRComparison'), { ssr: false });

export default function IRRComparisonPage() {
  return <IRRComparison />;
}
