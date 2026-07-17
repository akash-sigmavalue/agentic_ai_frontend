"use client";

import dynamic from 'next/dynamic';

const IRR = dynamic(() => import('@/components/feasibility_agent/IRR'), { ssr: false });

export default function IRRPage() {
  return <IRR />;
}
