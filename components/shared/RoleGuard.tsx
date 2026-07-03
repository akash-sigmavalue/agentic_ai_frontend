"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ShieldX, Loader2 } from 'lucide-react';

interface RoleGuardProps {
  children: React.ReactNode;
  /** Roles allowed to view this content. */
  allowedRoles: ('ADMIN' | 'FREE' | 'PAID')[];
  /** Redirect to this path on denial. Defaults to /unauthorized */
  redirectTo?: string;
  /** If true, shows an inline error instead of redirecting. */
  inline?: boolean;
}

/**
 * RoleGuard — wraps content that should only be visible to specific roles.
 *
 * Usage:
 *   <RoleGuard allowedRoles={['ADMIN']}>
 *     <AdminPanel />
 *   </RoleGuard>
 */
export default function RoleGuard({
  children,
  allowedRoles,
  redirectTo = '/unauthorized',
  inline = false,
}: RoleGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    if (inline) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-16 px-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 border border-red-100">
            <ShieldX className="h-8 w-8 text-red-400" />
          </div>
          <p className="text-sm font-bold text-slate-700">Access Restricted</p>
          <p className="text-xs text-slate-400 max-w-xs">
            You don&apos;t have permission to view this content.
          </p>
        </div>
      );
    }
    // Redirect on next tick to avoid render-phase navigation
    setTimeout(() => router.push(redirectTo), 0);
    return null;
  }

  return <>{children}</>;
}
