"use client";

import { Suspense } from 'react';
import DashboardPage from './dashboard';
import RoleGuard from '@/components/shared/RoleGuard';

export default function Page() {
  return (
    <RoleGuard allowedRoles={['ADMIN']} agentKey="ui_creation">
      <Suspense fallback={null}>
        <DashboardPage />
      </Suspense>
    </RoleGuard>
  );
}
