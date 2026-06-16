import { History, Search, Settings, Sparkles } from "lucide-react";

const navItems = [
  { label: "Query", icon: Search, active: true },
  { label: "History", icon: History },
  { label: "Settings", icon: Settings },
];

export default function AgentSidebar() {
  return (
    <aside className="w-full shrink-0 border-b border-slate-200 bg-white px-4 py-5 lg:w-64 lg:border-b-0 lg:border-r">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#5b4cf5] text-sm font-black text-white">
          SV
        </div>
        <div>
          <p className="text-sm font-black text-slate-950">Universal RERA Agent</p>
          <p className="text-xs text-slate-500">Sigma Value - all India</p>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Portal auto-routing
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto lg:block lg:space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              className={`flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                item.active
                  ? "bg-[#eef0fb] text-[#4536e0]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
