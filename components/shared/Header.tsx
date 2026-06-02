"use client";

import React from 'react';
import Link from 'next/link';
import { Network, Map, Cpu, LayoutDashboard, Sun, Moon, SlidersHorizontal } from 'lucide-react';
import { usePathname } from 'next/navigation';
import AgentListDropdown from './AgentListDropdown';
import { apiFetch } from '../../lib/api-client';

const Header = () => {
  const [isDark, setIsDark] = React.useState(false);
  const pathname = usePathname();
  const [llmProvider, setLlmProvider] = React.useState<'openai' | 'bedrock'>('openai');
  const [llmModel, setLlmModel] = React.useState<string>('gpt-4o-mini');
  const [modelsByProvider, setModelsByProvider] = React.useState<Record<string, string[]>>({
    openai: ['gpt-4o-mini', 'gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini'],
    bedrock: ['moonshotai.kimi-k2.5', 'deepseek.v3.2'],
  });
  const [llmReady, setLlmReady] = React.useState(false);

  React.useEffect(() => {
    // Hydrate state from localStorage only after initial render
    const theme = localStorage.getItem('sigmavalue_theme') === 'dark';
    setIsDark(theme);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function loadSelection() {
      try {
        const cachedProvider = (localStorage.getItem('sigmavalue_llm_provider') || '').trim().toLowerCase();
        const cachedModel = (localStorage.getItem('sigmavalue_llm_model') || '').trim();
        if (cachedProvider === 'openai' || cachedProvider === 'bedrock') {
          setLlmProvider(cachedProvider);
        }
        if (cachedModel) {
          setLlmModel(cachedModel);
        }

        const data = await apiFetch<{
          selection?: { provider?: string; model?: string };
          allowed?: { providers?: string[]; models_by_provider?: Record<string, string[]> };
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
        // If backend isn't reachable, keep local defaults without blocking UI.
        console.warn('Failed to load LLM selection', error);
      } finally {
        if (!cancelled) setLlmReady(true);
      }
    }

    loadSelection();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', isDark);
    localStorage.setItem('sigmavalue_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const persistAndApplySelection = React.useCallback(
    async (provider: 'openai' | 'bedrock', model: string) => {
      localStorage.setItem('sigmavalue_llm_provider', provider);
      localStorage.setItem('sigmavalue_llm_model', model);
      setLlmProvider(provider);
      setLlmModel(model);

      try {
        await apiFetch('/v1/llm/selection', {
          method: 'POST',
          body: JSON.stringify({ provider, model }),
        });
      } catch (error) {
        console.warn('Failed to update LLM selection', error);
      }
    },
    [],
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const shellClass = isDark
    ? 'bg-slate-950/85 border-slate-800/70'
    : 'bg-[#f8fafc]/80 border-slate-200/60';
  const titleClass = isDark ? 'text-slate-50' : 'text-[#1a1c3d]';
  const subtitleClass = isDark ? 'text-slate-400' : 'text-slate-400';
  const pillClass = isDark
    ? 'bg-slate-900 border-slate-700 shadow-[0_10px_25px_rgba(0,0,0,0.25)] hover:bg-slate-800'
    : 'bg-white border-slate-200 shadow-sm hover:bg-slate-50';
  const pillTextClass = isDark ? 'text-slate-200' : 'text-slate-600';
  const borderTextClass = isDark ? 'border-slate-800' : 'border-slate-200';
  const toggleClass = isDark
    ? 'bg-slate-900 border-slate-700'
    : 'bg-slate-100 border-slate-200';

  return (
    <header className={`fixed top-0 left-0 z-[1001] flex h-20 w-full items-center justify-between px-10 backdrop-blur-md border-b ${shellClass}`}>
      {/* Brand Section */}
      <Link href="/" className="flex items-center gap-4 cursor-pointer">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#525ceb] shadow-lg shadow-indigo-200">
          <Cpu className="h-7 w-7 text-white" />
        </div>
        <div className="flex flex-col">
          <h1 className={`text-xl font-black tracking-tight leading-none mb-1 ${titleClass}`}>Sigmavalue AI Pilot</h1>
          <span className={`text-[10px] font-black tracking-[0.25em] uppercase ${subtitleClass}`}>INTELLIGENT WORKSPACE</span>
        </div>
      </Link>

      {/* Navigation & User Section */}
      <div className="flex items-center gap-8">
        {/* Navigation Pills */}
        <div className="hidden lg:flex items-center gap-3">
          {/* <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all cursor-pointer group ${pillClass}`}>
            <SlidersHorizontal className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            <span className={`text-[10px] font-black uppercase tracking-widest ${pillTextClass}`}>GPT-4O MINI</span>
          </div> */}
          {/* <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all cursor-pointer group ${pillClass}`}>
            <Network className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            <span className={`text-[10px] font-black uppercase tracking-widest ${pillTextClass}`}>WORKFLOW</span>
          </div> */}
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

          {/* Global LLM selector (applies across all agents) */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all ${pillClass}`}>
            <SlidersHorizontal className="h-4 w-4 text-slate-400" />
            <select
              value={llmProvider}
              onChange={(e) => handleProviderChange(e.target.value as 'openai' | 'bedrock')}
              className={`reai-native-select cursor-pointer pointer-events-auto appearance-auto rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest outline-none ${pillTextClass}`}
              aria-label="LLM provider"
              title="LLM provider"
            >
              <option value="openai">OPENAI</option>
              <option value="bedrock">BEDROCK</option>
            </select>
            <span className={`text-[10px] font-black ${pillTextClass}`}>/</span>
            <select
              value={llmModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className={`reai-native-select cursor-pointer pointer-events-auto appearance-auto rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest outline-none ${pillTextClass}`}
              aria-label="LLM model"
              title="LLM model"
            >
              {(modelsByProvider[llmProvider] || []).map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          <AgentListDropdown />
          {/* <div 
            onClick={handleLogout}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all cursor-pointer group ${isDark ? 'bg-slate-900/80 border-slate-700 hover:bg-slate-800' : 'bg-[#cbd5e1]/40 border-slate-300 hover:bg-slate-200'}`}
          >
            <Map className="h-4 w-4 text-[#525ceb] group-hover:scale-110 transition-transform" />
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>MAP</span>
          </div> */}
        </div>

        {/* User Controls */}
        <div className={`flex items-center gap-6 pl-8 ${borderTextClass} border-l`}>
          {/* Theme Toggle Button */}
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

          <div className="flex items-center gap-4">
            {/* <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200 font-bold text-slate-500 text-sm shadow-sm transition-transform hover:scale-105">
              R
            </div> */}
            {/* <div className="flex flex-col">
                <span className="text-[11px] font-black text-[#1a1c3d] tracking-widest uppercase">RAVILESH</span>
                <button 
                  onClick={handleLogout}
                  className="text-[9px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-[0.2em] text-left transition-colors"
                >
                  LOGOUT
                </button>
             </div> */}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
