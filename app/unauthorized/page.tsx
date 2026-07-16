"use client";

import React from 'react';
import Link from 'next/link';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function UnauthorizedPage() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-red-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full gap-6">
        {/* Icon */}
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-red-500/10 border border-red-500/20 shadow-2xl shadow-red-500/10">
          <ShieldX className="h-12 w-12 text-red-400" />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <p className="text-[10px] font-black tracking-[0.3em] uppercase text-red-400">
            Access Denied
          </p>
          <h1 className="text-4xl font-black text-white tracking-tight">
            Unauthorized
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed mt-3">
            You don&apos;t have permission to access this page.
            {user && user.role === 'FREE' && (
              <span className="block mt-2 text-indigo-300">
                Your current role is <span className="font-bold text-indigo-400">FREE</span>.
                This area requires higher privileges.
              </span>
            )}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 font-bold text-sm transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>

        {user && user.role === 'FREE' && (
          <div className="w-full rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-left mt-2">
            <p className="text-xs font-bold text-indigo-300 mb-1">Need more access?</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Visit your{' '}
              <Link href="/profile" className="text-indigo-400 hover:underline font-semibold">
                profile page
              </Link>{' '}
              to check your token status or request token activation for the Valuation Agent.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
