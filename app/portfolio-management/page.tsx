'use client';

import RoleGuard from '@/components/shared/RoleGuard';
import PortfolioManagementApp from '@/components/portfolio-management/PortfolioManagementApp';

export default function PortfolioManagementPage() {
  return (
    <RoleGuard allowedRoles={['ADMIN']} agentKey="portfolio_management">
      <main className="min-h-screen bg-slate-50 pt-20 font-sans text-slate-900">
        <PortfolioManagementApp />
      </main>
    </RoleGuard>
  );
}
