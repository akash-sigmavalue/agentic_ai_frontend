'use client';

import FrontendDashboard from "../../components/data_retrieval/FrontendDashboard";
import RoleGuard from "../../components/shared/RoleGuard";

export default function Page() {
  return (
    <RoleGuard allowedRoles={['ADMIN']} agentKey="data_retrieval">
      <FrontendDashboard />
    </RoleGuard>
  );
}
