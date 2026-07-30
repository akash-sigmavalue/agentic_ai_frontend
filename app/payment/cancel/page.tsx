"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { XCircle, ArrowLeft } from "lucide-react";

export default function PaymentCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6 py-20">
      <div className="text-center space-y-6 max-w-md mx-auto">
        <div className="w-20 h-20 rounded-full bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center mx-auto">
          <XCircle className="w-10 h-10 text-rose-400" />
        </div>

        <div>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight">Payment Cancelled</h1>
          <p className="text-slate-400 text-sm mt-2">
            Your payment was cancelled. You have not been charged.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400 text-left space-y-2">
          <p>No tokens were deducted and your account remains unchanged.</p>
          <p>
            If you experienced any issues, please contact us at{" "}
            <a href="mailto:hilton@sigmavalue.co.in" className="text-indigo-400 underline">
              hilton@sigmavalue.co.in
            </a>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => router.push("/pricing")}
            className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-600/20"
          >
            Try Again
          </button>
          <button
            onClick={() => router.push("/")}
            className="flex-1 py-3 px-5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
