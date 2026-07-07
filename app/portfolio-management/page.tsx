'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import PortfolioManagementApp from '@/components/portfolio-management/PortfolioManagementApp';

export default function PortfolioManagementPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.role !== 'ADMIN') {
      router.replace('/unauthorized');
    }
  }, [user, loading, router]);

  // While auth is resolving, or if the user is not ADMIN, show a spinner
  // (the effect above will redirect non-admins before the app renders)
  if (loading || !user || user.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pt-20 font-sans text-slate-900">
      <PortfolioManagementApp />
    </main>
  );
}
