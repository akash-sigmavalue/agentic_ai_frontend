"use client";

import dynamic from 'next/dynamic';

const ConstructionTable = dynamic(() => import('@/components/feasibility_agent/components/ConstructionTable'), { ssr: false });

export default function ConstructionTablePage() {
  return <ConstructionTable />;
}
