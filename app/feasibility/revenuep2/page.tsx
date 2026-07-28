"use client";

import dynamic from 'next/dynamic';

const RevenueP2 = dynamic(() => import('@/components/feasibility_agent/revenuep2'), { ssr: false });

export default function RevenueP2Page() {
  return <RevenueP2 />;
}
