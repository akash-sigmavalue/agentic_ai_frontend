"use client";

import { Suspense } from 'react';
import ConnectorPageClient from './ConnectorPageClient';
import RoleGuard from '@/components/shared/RoleGuard';

export default function ConnectorPage() {
  return (
    <RoleGuard allowedRoles={['ADMIN']} agentKey="connector">
      <Suspense fallback={null}>
        <ConnectorPageClient />
      </Suspense>
    </RoleGuard>
  );
}
