"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Building2, LayoutGrid } from "lucide-react";

const options = [
  { href: "/maharera_agent", label: "RERA Automation", icon: Building2 },
  { href: "/web_automation", label: "Web Automation", icon: Bot },
];

export default function AutomationRouteTabs() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed right-5 top-[5.5rem] z-[1000] flex items-center gap-1 rounded-2xl border border-slate-700/80 bg-slate-950/90 p-1.5 shadow-2xl backdrop-blur-xl"
      aria-label="Automation mode"
    >
      <Link
        href="/automation"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-white"
        title="Automation chooser"
      >
        <LayoutGrid className="h-4 w-4" />
      </Link>
      {options.map((option) => {
        const Icon = option.icon;
        const active = pathname === option.href;
        return (
          <Link
            key={option.href}
            href={option.href}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition ${
              active
                ? "bg-cyan-400 text-slate-950"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{option.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
