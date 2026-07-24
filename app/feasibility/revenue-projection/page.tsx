"use client";

import dynamic from 'next/dynamic';

const RevenueProjection = dynamic(() => import('@/components/feasibility_agent/RevenueProjection'), { ssr: false });

export default function RevenueProjectionPage() {
  return <RevenueProjection />;
}
