"use client";

import dynamic from 'next/dynamic';

const OwnershipCheck = dynamic(() => import('@/components/feasibility_agent/OwnershipCheck'), { ssr: false });

export default function OwnershipCheckPage() {
  return <OwnershipCheck />;
}
