import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, Building2, CheckCircle2, Globe2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Automation Agents | Sigmavalue AI Pilot",
  description: "Choose between RERA-specific and universal web automation.",
};

const automationOptions = [
  {
    order: "01",
    title: "RERA Automation",
    description:
      "Run the existing state-aware RERA workflow for project discovery, registration data, plans, and exports.",
    href: "/maharera_agent",
    icon: Building2,
    accent: "from-indigo-500 to-violet-600",
    features: ["Indian state RERA portals", "Location and portal resolution", "CSV and JSON results"],
  },
  {
    order: "02",
    title: "Web Automation",
    description:
      "Give the universal browser agent any URL and instruction, then monitor execution and answer human-input prompts.",
    href: "/web_automation",
    icon: Globe2,
    accent: "from-cyan-500 to-blue-600",
    features: ["Any target website", "Live WebSocket progress", "OTP, CAPTCHA and confirmation prompts"],
  },
];

export default function AutomationPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-5 pb-12 pt-28 text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(99,102,241,.35), transparent 30%), radial-gradient(circle at 85% 75%, rgba(6,182,212,.25), transparent 32%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Bot className="h-7 w-7 text-cyan-300" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">Automation workspace</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Choose your automation agent</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
            Use the dedicated RERA workflow for property-regulatory data, or the universal agent for general website tasks.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {automationOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Link
                key={option.href}
                href={option.href}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-2xl backdrop-blur-xl transition hover:-translate-y-1 hover:border-white/20 md:p-8"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${option.accent}`} />
                <div className="flex items-start justify-between gap-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${option.accent} shadow-lg`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <span className="text-xs font-black tracking-[0.25em] text-slate-600">{option.order}</span>
                </div>
                <h2 className="mt-7 text-2xl font-black">{option.title}</h2>
                <p className="mt-3 min-h-20 text-sm leading-7 text-slate-400">{option.description}</p>
                <div className="mt-5 space-y-3">
                  {option.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      {feature}
                    </div>
                  ))}
                </div>
                <div className="mt-7 flex items-center gap-2 text-sm font-black text-cyan-300">
                  Open {option.title}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
