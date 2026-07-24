"use client";

import dynamic from 'next/dynamic';

const SalesVelocity = dynamic(() => import('@/components/feasibility_agent/SalesVelocity'), { ssr: false });

export default function PredictSalesVelocityPage() {
  return <SalesVelocity />;
}
