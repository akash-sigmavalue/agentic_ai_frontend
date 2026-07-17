"use client";

import dynamic from 'next/dynamic';

const Osm = dynamic(() => import('@/components/feasibility_agent/Osm'), { ssr: false });

export default function OsmLogicPage() {
  return <Osm />;
}
