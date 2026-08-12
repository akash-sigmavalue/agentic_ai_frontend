"use client";

import dynamic from 'next/dynamic';

const ParkingLogic = dynamic(() => import('@/components/feasibility_agent/ParkingLogic'), { ssr: false });

export default function ParkingLogicPage() {
  return <ParkingLogic />;
}
