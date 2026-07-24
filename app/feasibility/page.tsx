"use client";

import dynamic from 'next/dynamic';

const Index = dynamic(() => import('@/components/feasibility_agent/Index'), { ssr: false });

export default function FeasibilityPage() {
  return <Index />;
}
