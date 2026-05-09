'use client';

import React, { useMemo, useState } from 'react';
import { BadgeCheck, Mail, Search, Sparkles } from 'lucide-react';
import {
  DEFAULT_GMAIL_ACTION_KEY,
  GMAIL_BROWSER_ITEMS,
  GmailActionKey,
  GmailBrowserItem,
} from './gmail-connector-config';

interface GmailConnectorFlowProps {
  selectedActionKey: GmailActionKey;
  connectedEmail: string | null;
  onConnectAccount: () => void;
  onOpenConnectionDetails: () => void;
  onSelectAction: (actionKey: GmailActionKey) => void;
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
      {label}
    </span>
  );
}

function ModuleActionCard({
  item,
  active,
  onClick,
}: {
  item: GmailBrowserItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
        active
          ? 'border-violet-300 bg-violet-50 shadow-sm shadow-violet-100'
          : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">{item.section}</p>
          <h4 className="mt-2 text-sm font-black text-[#1a1c3d]">{item.title}</h4>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
            item.badge === 'Trigger'
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : item.badge === 'Workflow'
                ? 'border-violet-200 bg-violet-50 text-violet-700'
                : item.badge === 'Sync'
                  ? 'border-sky-200 bg-sky-50 text-sky-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          {item.badge}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">{item.description}</p>
    </button>
  );
}

function ModuleSection({
  title,
  items,
  selectedActionKey,
  onSelectAction,
}: {
  title: string;
  items: GmailBrowserItem[];
  selectedActionKey: GmailActionKey;
  onSelectAction: (actionKey: GmailActionKey) => void;
}) {
  return (
    <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-600" />
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">{title}</p>
      </div>
      {items.length ? (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <ModuleActionCard
              key={item.key}
              item={item}
              active={item.key === selectedActionKey}
              onClick={() => onSelectAction(item.key)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500">
          No Gmail modules match your search.
        </div>
      )}
    </div>
  );
}

function ModuleSearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="sr-only">Search Gmail modules</span>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search Gmail modules"
          className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>
    </label>
  );
}

export default function GmailConnectorFlow({
  selectedActionKey,
  connectedEmail,
  onConnectAccount,
  onOpenConnectionDetails,
  onSelectAction,
}: GmailConnectorFlowProps) {
  const [search, setSearch] = useState('');

  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return [
        {
          title: 'Triggers',
          items: GMAIL_BROWSER_ITEMS.filter((item) => item.section === 'Triggers'),
        },
        {
          title: 'Actions',
          items: GMAIL_BROWSER_ITEMS.filter((item) => item.section === 'Actions'),
        },
      ];
    }

    const matches = GMAIL_BROWSER_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.section.toLowerCase().includes(query) ||
        item.badge.toLowerCase().includes(query)
    );

    return [
      {
        title: 'Matching modules',
        items: matches,
      },
    ];
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="relative w-full pt-3">
        <div className="rounded-[28px] border border-rose-200 bg-rose-50/70 p-5 shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white bg-gradient-to-br from-rose-500 to-violet-500 text-white shadow-lg shadow-rose-100">
            <Mail className="h-7 w-7" />
          </div>
          <div className="flex flex-col items-center text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-rose-500">Gmail</p>
            <h4 className="mt-2 text-2xl font-black tracking-tight text-[#1a1c3d]">Connector browser</h4>
            <div className="mt-3 flex justify-center">
              <StatusBadge label="Verified" />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Automation-ready Gmail module browser for triggers, actions, and workflow setup.
            </p>
            <button
              type="button"
              onClick={onOpenConnectionDetails}
              className="mt-4 inline-flex min-w-[11rem] items-center gap-2 self-center rounded-2xl border border-violet-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-violet-300 hover:bg-violet-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                <BadgeCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Connected Email</p>
                <p className="mt-1 truncate text-sm font-black text-[#1a1c3d]">
                  {connectedEmail || 'Open connector details'}
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={onConnectAccount}
              className="mt-3 inline-flex items-center justify-center rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-violet-500"
            >
              Connect Gmail
            </button>
          </div>
          <div className="mt-5">
            <ModuleSearchInput value={search} onChange={setSearch} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredSections.map((section) => (
          <ModuleSection
            key={section.title}
            title={section.title}
            items={section.items}
            selectedActionKey={selectedActionKey || DEFAULT_GMAIL_ACTION_KEY}
            onSelectAction={onSelectAction}
          />
        ))}
      </div>
    </div>
  );
}
