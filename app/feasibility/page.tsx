"use client";

import dynamic from 'next/dynamic';
import RoleGuard from '@/components/shared/RoleGuard';

const Index = dynamic(() => import('@/components/feasibility_agent/Index'), { ssr: false });

export default function FeasibilityPage() {
  return (
    <RoleGuard allowedRoles={['ADMIN']} agentKey="feasibility">
      <Index />
    </RoleGuard>
  );
}
