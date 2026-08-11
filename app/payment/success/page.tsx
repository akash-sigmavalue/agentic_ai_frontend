"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Zap, ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [tokens, setTokens] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      return;
    }

    const verify = async () => {
      try {
        const data = await apiFetch<{
          success: boolean;
          tokens_credited: number;
          amount_inr: number;
          new_balance?: number;
        }>(`/payments/status/${sessionId}`);

        if (data.success) {
          setTokens(data.tokens_credited || 1000000);
          setStatus("success");
          // Refresh auth profile so user personal_token_balance updates immediately in UI
          await refreshProfile();
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    };


    verify();
  }, [sessionId]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
        <p className="text-sm font-medium">Verifying your payment…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-xl font-black text-slate-100">Payment Not Confirmed</h2>
        <p className="text-sm text-slate-400">
          We could not verify your payment. If you were charged, please contact
          us at <a href="mailto:hilton@sigmavalue.co.in" className="text-indigo-400 underline">hilton@sigmavalue.co.in</a> and we'll resolve it immediately.
        </p>
        <button
          onClick={() => router.push("/pricing")}
          className="px-6 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-bold text-sm hover:bg-slate-700 transition-all"
        >
          Return to Pricing
        </button>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6 max-w-md mx-auto">
      <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
      </div>

      <div>
        <h1 className="text-3xl font-black text-slate-100 tracking-tight">Payment Successful!</h1>
        <p className="text-slate-400 text-sm mt-2">Your tokens have been credited to your wallet instantly.</p>
      </div>

      <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-800/60 space-y-1">
        <div className="text-4xl font-black text-emerald-300">{tokens.toLocaleString()}</div>
        <div className="text-xs font-bold uppercase tracking-wider text-emerald-500">Tokens Added to Your Wallet</div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={() => router.push("/valuation")}
          className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-purple-500 transition-all"
        >
          <Zap className="w-4 h-4" /> Start Using Agent
        </button>
        <button
          onClick={() => router.push("/profile")}
          className="flex-1 py-3 px-5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
        >
          View Wallet <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-slate-500">
        A confirmation email has been sent to your registered email address.
      </p>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6 py-20">
      <Suspense fallback={<Loader2 className="w-10 h-10 animate-spin text-indigo-400" />}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
