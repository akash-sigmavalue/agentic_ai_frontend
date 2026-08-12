"use client";

import dynamic from 'next/dynamic';

const ConstructionTimetable = dynamic(() => import('@/components/feasibility_agent/ConstructionTimetable'), { ssr: false });

export default function ConstructionTimetablePage() {
  return <ConstructionTimetable />;
}
