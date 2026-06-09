"use client";

import React from 'react';
import Link from 'next/link';
import { Cpu, LayoutDashboard, Sun, Moon, SlidersHorizontal } from 'lucide-react';
import { usePathname } from 'next/navigation';
import AgentListDropdown from './AgentListDropdown';

const Header = () => {
  const [isDark, setIsDark] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sigmavalue_theme') === 'dark';
  });
  const pathname = usePathname();
  const shouldSyncLlmSelection = pathname !== '/maharera_agent';
  const [llmProvider, setLlmProvider] = React.useState<'openai' | 'bedrock'>('openai');
  const [llmModel, setLlmModel] = React.useState('gpt-4o-mini');
  const [modelsByProvider, setModelsByProvider] = React.useState<Record<string, string[]>>({
    openai: ['gpt-4o-mini', 'gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini'],
    bedrock: ['moonshotai.kimi-k2.5', 'deepseek.v3.2'],
  });

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', isDark);
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    localStorage.setItem('sigmavalue_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadSelection() {
      try {
        const cachedProvider = (localStorage.getItem('sigmavalue_llm_provider') || '').trim().toLowerCase();
        const cachedModel = (localStorage.getItem('sigmavalue_llm_model') || '').trim();
        if (cachedProvider === 'openai' || cachedProvider === 'bedrock') {
          setLlmProvider(cachedProvider);
        }
        if (cachedModel) setLlmModel(cachedModel);

        if (!shouldSyncLlmSelection) return;

        const data = await apiFetch<{
          selection?: { provider?: string; model?: string };
          allowed?: { models_by_provider?: Record<string, string[]> };
        }>('/v1/llm/selection');

        if (cancelled) return;
        if (data?.allowed?.models_by_provider) {
          setModelsByProvider(data.allowed.models_by_provider);
        }
        const provider = (data?.selection?.provider || '').toLowerCase();
        const model = data?.selection?.model || '';
        if (provider === 'openai' || provider === 'bedrock') {
          setLlmProvider(provider);
          localStorage.setItem('sigmavalue_llm_provider', provider);
        }
        if (model) {
          setLlmModel(model);
          localStorage.setItem('sigmavalue_llm_model', model);
        }
      } catch (error) {
        console.warn('Failed to load LLM selection', error);
      }
    }

    loadSelection();
    return () => {
      cancelled = true;
    };
  }, [shouldSyncLlmSelection]);

  const persistAndApplySelection = React.useCallback(
    async (provider: 'openai' | 'bedrock', model: string) => {
      localStorage.setItem('sigmavalue_llm_provider', provider);
      localStorage.setItem('sigmavalue_llm_model', model);
      setLlmProvider(provider);
      setLlmModel(model);
      if (!shouldSyncLlmSelection) return;
      try {
        await apiFetch('/v1/llm/selection', {
          method: 'POST',
          body: JSON.stringify({ provider, model }),
        });
      } catch (error) {
        console.warn('Failed to update LLM selection', error);
      }
    },
    [shouldSyncLlmSelection],
  );

  const handleProviderChange = async (nextProvider: 'openai' | 'bedrock') => {
    const allowed = modelsByProvider[nextProvider] || [];
    const nextModel = allowed.includes(llmModel) ? llmModel : allowed[0] || llmModel;
    await persistAndApplySelection(nextProvider, nextModel);
  };

  const handleModelChange = async (nextModel: string) => {
    await persistAndApplySelection(llmProvider, nextModel);
  };

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const shellClass = isDark
    ? 'bg-slate-950/85 border-slate-800/70'
    : 'bg-[#f8fafc]/80 border-slate-200/60';
  const titleClass = isDark ? 'text-slate-50' : 'text-[#1a1c3d]';
  const subtitleClass = isDark ? 'text-slate-400' : 'text-slate-400';
  const pillClass = isDark
    ? 'bg-slate-900 border-slate-700 shadow-[0_10px_25px_rgba(0,0,0,0.25)] hover:bg-slate-800'
    : 'bg-white border-slate-200 shadow-sm hover:bg-slate-50';
  const pillTextClass = isDark ? 'text-slate-200' : 'text-slate-700';
  const borderTextClass = isDark ? 'border-slate-800' : 'border-slate-200';
  const toggleClass = isDark
    ? 'bg-slate-900 border-slate-700'
    : 'bg-slate-100 border-slate-200';

  return (
    <header className={`site-header fixed top-0 left-0 z-[1001] flex h-20 w-full items-center justify-between px-10 backdrop-blur-md border-b ${shellClass}`}>
      <Link href="/" className="flex items-center gap-4 cursor-pointer">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#525ceb] shadow-lg shadow-indigo-200">
          <Cpu className="h-7 w-7 text-white" />
        </div>
        <div className="flex flex-col">
          <h1 className={`text-xl font-black tracking-tight leading-none mb-1 ${titleClass}`}>Sigmavalue AI Pilot</h1>
          <span className={`text-[10px] font-black tracking-[0.25em] uppercase ${subtitleClass}`}>INTELLIGENT WORKSPACE</span>
        </div>
      </Link>

      <div className="flex items-center gap-8">
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/portfolio-management"
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all cursor-pointer group ${
              pathname === '/portfolio-management'
                ? isDark
                  ? 'bg-indigo-950 border-indigo-800'
                  : 'bg-indigo-50 border-indigo-200'
                : pillClass
            }`}
          >
            <LayoutDashboard className={`h-4 w-4 transition-colors ${pathname === '/portfolio-management' ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-600'}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${pathname === '/portfolio-management' ? (isDark ? 'text-indigo-300' : 'text-indigo-700') : pillTextClass}`}>SOLUTION</span>
          </Link>
          <AgentListDropdown />
        </div>

        <div className={`flex items-center gap-6 pl-8 ${borderTextClass} border-l`}>
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 p-1 rounded-full border transition-all hover:shadow-inner ${toggleClass}`}
          >
            <div className={`p-1.5 rounded-full ${!isDark ? 'bg-white shadow-sm' : ''}`}>
              <Sun className={`h-3.5 w-3.5 ${!isDark ? 'text-amber-500' : 'text-slate-400'}`} />
            </div>
            <div className={`p-1.5 rounded-full ${isDark ? 'bg-slate-800 shadow-sm' : ''}`}>
              <Moon className={`h-3.5 w-3.5 ${isDark ? 'text-blue-400' : 'text-slate-400'}`} />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
