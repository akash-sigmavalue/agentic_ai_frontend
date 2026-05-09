'use client';

import React, { useMemo, useState } from 'react';
import { BadgeCheck, CheckCircle2, FileText, Search, Sparkles, Workflow, X } from 'lucide-react';
import {
  DEFAULT_GOOGLE_FORMS_ACTION_KEY,
  GOOGLE_FORMS_BROWSER_ITEMS,
  GoogleFormsActionBadge,
  GoogleFormsActionDefinition,
  GoogleFormsBrowserItem,
  GoogleFormsFieldDefinition,
  GoogleFormsFormValues,
  buildInitialGoogleFormsFormValues,
  getGoogleFormsActionDefinition,
  GoogleFormsActionKey,
} from './google-forms-connector-config';

interface GoogleFormsConnectorFlowProps {
  connectedEmail: string | null;
  onConnectAccount: () => void;
  onOpenConnectionDetails: () => void;
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
      {label}
    </span>
  );
}

function badgeTone(badge: GoogleFormsActionBadge) {
  switch (badge) {
    case 'Trigger':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'Workflow':
      return 'border-violet-200 bg-violet-50 text-violet-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => (
        <li key={step} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-black text-violet-700 shadow-sm">
            {index + 1}
          </span>
          <p className="text-sm leading-relaxed text-slate-600">{step}</p>
        </li>
      ))}
    </ol>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: GoogleFormsFieldDefinition;
  value: string;
  onChange: (nextValue: string) => void;
}) {
  const required = field.required;
  const baseInput =
    'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100';

  return (
    <label className={`block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${field.spanFull ? 'md:col-span-2' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{field.label}</span>
        <span
          className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${
            required ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-slate-50 text-slate-500'
          }`}
        >
          {required ? 'Required' : 'Optional'}
        </span>
      </div>

      {field.type === 'textarea' ? (
        <textarea
          value={value}
          required={required}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          className={`${baseInput} mt-3 min-h-[120px] resize-y`}
        />
      ) : field.type === 'select' ? (
        <select value={value} required={required} onChange={(event) => onChange(event.target.value)} className={`${baseInput} mt-3`}>
          {!required ? <option value="">{field.placeholder}</option> : null}
          {(field.options || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          value={value}
          required={required}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          className={`${baseInput} mt-3`}
        />
      )}

      {field.helperText ? <p className="mt-2 text-xs leading-relaxed text-slate-500">{field.helperText}</p> : null}
    </label>
  );
}

function ModuleCard({
  item,
  active,
  onClick,
}: {
  item: GoogleFormsBrowserItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
        active ? 'border-violet-300 bg-violet-50 shadow-sm shadow-violet-100' : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">{item.section}</p>
          <h4 className="mt-2 text-sm font-black text-[#1a1c3d]">{item.title}</h4>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${badgeTone(item.badge)}`}>
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
  items: GoogleFormsBrowserItem[];
  selectedActionKey: string;
  onSelectAction: (actionKey: string) => void;
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
            <ModuleCard key={item.key} item={item} active={item.key === selectedActionKey} onClick={() => onSelectAction(item.key)} />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500">
          No Google Forms modules match your search.
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
      <span className="sr-only">Search Google Forms modules</span>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search Google Forms modules"
          className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>
    </label>
  );
}

function ActionDetailsPanel({
  action,
  values,
  onChange,
  onCancel,
  onSaveDraft,
}: {
  action: GoogleFormsActionDefinition;
  values: GoogleFormsFormValues;
  onChange: (fieldKey: string, nextValue: string) => void;
  onCancel: () => void;
  onSaveDraft: () => void;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Selected Action Details</p>
            <h3 className="mt-2 text-xl font-black tracking-tight text-[#1a1c3d]">{action.title}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{action.description}</p>
          </div>
          <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${badgeTone(action.badge)}`}>
            {action.badge}
          </span>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-5">
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {action.fields.map((field) => (
              <FieldRenderer
                key={field.key}
                field={field}
                value={values[field.key] || ''}
                onChange={(nextValue) => onChange(field.key, nextValue)}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">How this works</p>
            </div>
            <div className="mt-4">
              <StepList steps={action.steps} />
            </div>
          </div>

          <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Workflow className="h-4 w-4 text-violet-600" />
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Frontend behavior / rule</p>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">{action.frontendRule}</p>
            <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-700">Current action key</p>
              <p className="mt-2 text-sm font-black text-[#1a1c3d]">{action.key}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSaveDraft}
            className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GoogleFormsConnectorFlow({ connectedEmail, onConnectAccount, onOpenConnectionDetails }: GoogleFormsConnectorFlowProps) {
  const [search, setSearch] = useState('');
  const [selectedActionKey, setSelectedActionKey] = useState<GoogleFormsActionKey>(DEFAULT_GOOGLE_FORMS_ACTION_KEY);
  const [formValues, setFormValues] = useState<Record<string, GoogleFormsFormValues>>(() =>
    GOOGLE_FORMS_BROWSER_ITEMS.reduce((accumulator, item) => {
      const action = getGoogleFormsActionDefinition(item.key);
      accumulator[item.key] = buildInitialGoogleFormsFormValues(action);
      return accumulator;
    }, {} as Record<string, GoogleFormsFormValues>)
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return [
        { title: 'Triggers', items: GOOGLE_FORMS_BROWSER_ITEMS.filter((item) => item.section === 'Triggers') },
        { title: 'Workflow', items: GOOGLE_FORMS_BROWSER_ITEMS.filter((item) => item.section === 'Workflow') },
      ];
    }

    const matches = GOOGLE_FORMS_BROWSER_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.section.toLowerCase().includes(query) ||
        item.badge.toLowerCase().includes(query)
    );

    return [{ title: 'Matching modules', items: matches }];
  }, [search]);

  const selectedAction = useMemo(() => getGoogleFormsActionDefinition(selectedActionKey), [selectedActionKey]);

  const updateField = (fieldKey: string, nextValue: string) => {
    setFormValues((current) => ({
      ...current,
      [selectedActionKey]: {
        ...(current[selectedActionKey] || {}),
        [fieldKey]: nextValue,
      },
    }));
  };

  const resetCurrentAction = () => {
    setFormValues((current) => ({
      ...current,
      [selectedActionKey]: buildInitialGoogleFormsFormValues(selectedAction),
    }));
  };

  return (
    <div className="space-y-4">
      <div className="relative w-full pt-3">
        <div className="rounded-[28px] border border-violet-200 bg-violet-50/70 p-5 shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white bg-gradient-to-br from-violet-500 to-sky-500 text-white shadow-lg shadow-violet-100">
            <FileText className="h-7 w-7" />
          </div>
          <div className="flex flex-col items-center text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.32em] text-violet-500">Google Forms</p>
              <h4 className="mt-2 text-2xl font-black tracking-tight text-[#1a1c3d]">Connector browser</h4>
              <div className="mt-3 flex justify-center">
                <StatusBadge label="Verified" />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Google Forms trigger browser for form submission routing and webhook-based intake.
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
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Connected Account</p>
                  <p className="mt-1 truncate text-sm font-black text-[#1a1c3d]">{connectedEmail || 'Open connector details'}</p>
                </div>
              </button>
              <button
                type="button"
                onClick={onConnectAccount}
                className="mt-3 inline-flex items-center justify-center rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-violet-500"
              >
                Connect Google Account
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
            selectedActionKey={selectedActionKey}
              onSelectAction={(actionKey) => {
              setSelectedActionKey(actionKey as GoogleFormsActionKey);
              setIsModalOpen(true);
            }}
          />
        ))}
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[32px] border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Action opened</p>
                <h3 className="mt-2 text-lg font-black text-[#1a1c3d]">{selectedAction.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-violet-200 hover:text-violet-700"
                aria-label="Close action details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 md:p-6">
              <ActionDetailsPanel
                action={selectedAction}
                values={formValues[selectedActionKey] || buildInitialGoogleFormsFormValues(selectedAction)}
                onChange={updateField}
                onCancel={() => {
                  resetCurrentAction();
                  setIsModalOpen(false);
                }}
                onSaveDraft={() => setIsModalOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
