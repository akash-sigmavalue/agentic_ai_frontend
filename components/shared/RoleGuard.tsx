"use client";

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import AgentDemoGuard from './AgentDemoGuard';

interface RoleGuardProps {
  children: React.ReactNode;
  /** Roles allowed to view this content. */
  allowedRoles: ('ADMIN' | 'FREE' | 'PAID')[];
  /** Agent key for demo video & capability presentation */
  agentKey?: string;
  /** Redirect to this path on denial. Defaults to demo view */
  redirectTo?: string;
  /** If true, shows an inline error instead of demo view. */
  inline?: boolean;
}

/**
 * RoleGuard — wraps content that should only be visible to specific roles.
 * Shows AgentDemoGuard (Demo Video + Contact Us) for non-admin users accessing restricted agent routes.
 */
export default function RoleGuard({
  children,
  allowedRoles,
  agentKey = "data_retrieval",
  inline = false,
}: RoleGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <AgentDemoGuard agentKey={agentKey} />;
  }

  return <>{children}</>;
}
