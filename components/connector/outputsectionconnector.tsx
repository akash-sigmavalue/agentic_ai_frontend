'use client';

import React, { useMemo, useState } from 'react';
import { CheckCircle2, Save, Workflow, X } from 'lucide-react';
import GmailConnectorFlow from './gmailconnectorflow';
import GoogleFormsConnectorFlow from './googleformsconnectorflow';
import {
  DEFAULT_GMAIL_ACTION_KEY,
  GMAIL_ACTION_DEFINITIONS,
  GmailActionBadge,
  GmailActionDefinition,
  GmailActionKey,
  GmailFieldDefinition,
  GmailFormValues,
  buildInitialGmailFormValues,
  getGmailActionDefinition,
} from './gmail-connector-config';
import type {
  ConnectionState,
  ConnectorActivityItem,
  ConnectorCapability,
  ConnectorInstance,
  ConnectorInstanceConfiguration,
  ConnectorPublishResult,
  ConnectorRegistryResponse,
  ConnectorTestResult,
  ConnectorWorkflowDraft,
  MissingField,
  PublishState,
  TestState,
} from '../../types/api';

interface OutputSectionConnectorProps {
  draft: ConnectorWorkflowDraft | null;
  registry: ConnectorRegistryResponse | null;
  selectedConnectorKey: string | null;
  selectedCapability: ConnectorCapability | null;
  instance: ConnectorInstance | null;
  connectedEmail: string | null;
  configuration: ConnectorInstanceConfiguration;
  missingFields: Array<MissingField | string>;
  connectionState: ConnectionState;
  testState: TestState;
  publishState: PublishState;
  testResult: ConnectorTestResult | null;
  publishResult: ConnectorPublishResult | null;
  activity: ConnectorActivityItem[];
  onConfigurationPatch: (patch: Partial<ConnectorInstanceConfiguration>) => void;
  onMissingFieldChange: (fieldKey: string, value: string) => void;
  onSaveDraft: () => void | Promise<void>;
  onTest: () => void | Promise<void>;
  onPublish: () => void | Promise<void>;
  onSelectConnectorKey: (connectorKey: string) => void;
  onConnectGoogleAccount: (accountLabel: string, popup?: Window | null) => void | Promise<void>;
}

type GmailActionFormState = Record<GmailActionKey, GmailFormValues>;

function buildInitialForms(): GmailActionFormState {
  return GMAIL_ACTION_DEFINITIONS.reduce((accumulator, definition) => {
    accumulator[definition.key] = buildInitialGmailFormValues(definition);
    return accumulator;
  }, {} as GmailActionFormState);
}

function badgeTone(badge: GmailActionBadge) {
  switch (badge) {
    case 'Trigger':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'Workflow':
      return 'border-violet-200 bg-violet-50 text-violet-700';
    case 'Read':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    case 'Sync':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
}

function formatJson(value: unknown) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
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

function StatusBadge({ badge }: { badge: GmailActionBadge }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${badgeTone(badge)}`}>{badge}</span>;
}

function DynamicFieldRenderer({
  field,
  value,
  values,
  onChange,
}: {
  field: GmailFieldDefinition;
  value: string;
  values: GmailFormValues;
  onChange: (nextValue: string) => void;
}) {
  const required = field.required || Boolean(field.isRequired?.(values));
  const requiredLabel = required ? 'Required' : 'Optional';
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
          {requiredLabel}
        </span>
      </div>

      {field.type === 'textarea' ? (
        <textarea
          value={value}
          required={required}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          className={`${baseInput} mt-3 min-h-[130px] resize-y`}
        />
      ) : field.type === 'select' ? (
        <select
          value={value}
          required={required}
          onChange={(event) => onChange(event.target.value)}
          className={`${baseInput} mt-3`}
        >
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

function ActionDetailsPanel({
  action,
  values,
  onChange,
  onCancel,
  onSaveDraft,
}: {
  action: GmailActionDefinition;
  values: GmailFormValues;
  onChange: (fieldKey: string, nextValue: string) => void;
  onCancel: () => void;
  onSaveDraft: () => void | Promise<void>;
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
          <StatusBadge badge={action.badge} />
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-5">
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {action.fields.map((field) => (
              <DynamicFieldRenderer
                key={field.key}
                field={field}
                value={values[field.key] || ''}
                values={values}
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
            <Save className="mr-2 inline h-4 w-4" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ConnectionDetailsModal({
  open,
  connectedEmail,
  connectionState,
  instance,
  selectedCapability,
  configuration,
  onClose,
}: {
  open: boolean;
  connectedEmail: string | null;
  connectionState: ConnectionState;
  instance: ConnectorInstance | null;
  selectedCapability: ConnectorCapability | null;
  configuration: ConnectorInstanceConfiguration;
  onClose: () => void;
}) {
  if (!open) return null;

  const connectorTitle = selectedCapability?.display_name || configuration.connector_key || 'Gmail connector';
  const serviceLabel = configuration.service_key || selectedCapability?.services?.[0]?.service_key || 'Not selected';
  const triggerLabel = configuration.trigger_key || selectedCapability?.triggers?.[0]?.operation_key || 'Not selected';
  const actionLabel = configuration.action_key || selectedCapability?.actions?.[0]?.operation_key || 'Not selected';
  const emailLabel = connectedEmail || 'No Gmail account connected yet';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[32px] border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Connected Email</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-[#1a1c3d]">Connected Gmail details</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Everything the connector knows about the current Gmail authorization and selected connector configuration.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-violet-200 hover:text-violet-700"
              aria-label="Close connected email details"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Connected account</p>
              <p className="mt-2 text-sm font-black text-[#1a1c3d]">{emailLabel}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                This is the Gmail identity used by replies, drafts, reads, triggers, and sync actions.
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Connection state</p>
              <p className="mt-2 text-sm font-black text-[#1a1c3d]">{connectionState}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                The UI treats this connector as ready when Gmail OAuth metadata is present.
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Connector name</p>
              <p className="mt-2 text-sm font-black text-[#1a1c3d]">{connectorTitle}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                The selected connector record and its configuration snapshot are shown here.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] border border-violet-200 bg-violet-50/70 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-700">Connector key</p>
              <p className="mt-2 break-words text-sm font-black text-[#1a1c3d]">{configuration.connector_key || 'gmail'}</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Service key</p>
              <p className="mt-2 break-words text-sm font-black text-[#1a1c3d]">{serviceLabel}</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Trigger key</p>
              <p className="mt-2 break-words text-sm font-black text-[#1a1c3d]">{triggerLabel}</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Action key</p>
              <p className="mt-2 break-words text-sm font-black text-[#1a1c3d]">{actionLabel}</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Connector config</p>
              <pre className="mt-3 max-h-64 overflow-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
                {formatJson({
                  connector_key: configuration.connector_key,
                  service_key: configuration.service_key,
                  trigger_key: configuration.trigger_key,
                  action_key: configuration.action_key,
                })}
              </pre>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Auth details</p>
              <pre className="mt-3 max-h-64 overflow-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
                {formatJson(instance?.configuration?.auth || {})}
              </pre>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Metadata details</p>
              <pre className="mt-3 max-h-64 overflow-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
                {formatJson(instance?.configuration?.metadata || {})}
              </pre>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Additional connector details</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Capability metadata</p>
                <pre className="mt-2 max-h-52 overflow-auto text-xs leading-relaxed text-slate-600">{formatJson(selectedCapability?.metadata || {})}</pre>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Instance settings</p>
                <pre className="mt-2 max-h-52 overflow-auto text-xs leading-relaxed text-slate-600">{formatJson(instance?.configuration?.settings || {})}</pre>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleAccountChoiceModal({
  open,
  connectorTitle,
  onClose,
  onConfirm,
}: {
  open: boolean;
  connectorTitle: string;
  onClose: () => void;
  onConfirm: (accountLabel: string, popup: Window | null) => void | Promise<void>;
}) {
  const [selectedAccount, setSelectedAccount] = useState('Primary connected account');

  if (!open) return null;

  const options = ['Primary connected account', 'Work Gmail account', 'Support Gmail account'];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Google account</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-[#1a1c3d]">Choose the account slot</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Select which Google account label you want to connect for {connectorTitle}. The Google sign-in popup will still let you pick the actual account.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-violet-200 hover:text-violet-700"
              aria-label="Close google account choice"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid gap-3">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSelectedAccount(option)}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  selectedAccount === option ? 'border-violet-300 bg-violet-50 shadow-sm' : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40'
                }`}
              >
                <p className="text-sm font-black text-[#1a1c3d]">{option}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">Used as the connector account label inside this workspace.</p>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const popup = window.open('about:blank', '_blank');
                void onConfirm(selectedAccount, popup);
              }}
              className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-500"
            >
              Continue to Google sign-in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OutputSectionConnector({
  selectedConnectorKey,
  selectedCapability,
  instance,
  connectedEmail: connectedEmailProp,
  connectionState,
  onSaveDraft,
  onConnectGoogleAccount,
}: OutputSectionConnectorProps) {
  const [selectedActionKey, setSelectedActionKey] = useState<GmailActionKey>(DEFAULT_GMAIL_ACTION_KEY);
  const [actionForms, setActionForms] = useState<GmailActionFormState>(() => buildInitialForms());
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  const connectedEmail = useMemo(() => {
    if (connectedEmailProp && connectedEmailProp.trim()) {
      return connectedEmailProp.trim();
    }

    const metadataEmail = instance?.configuration?.metadata?.google_email;
    if (typeof metadataEmail === 'string' && metadataEmail.trim()) {
      return metadataEmail.trim();
    }

    const authEmail = instance?.configuration?.auth?.email;
    if (typeof authEmail === 'string' && authEmail.trim()) {
      return authEmail.trim();
    }

    return null;
  }, [connectedEmailProp, instance]);

  const selectedAction = useMemo(() => getGmailActionDefinition(selectedActionKey), [selectedActionKey]);
  const activeConnectorKey = selectedCapability?.connector_key || selectedConnectorKey || 'gmail';
  const isGmailConnector = activeConnectorKey === 'gmail';
  const isGoogleFormsConnector = activeConnectorKey === 'google_forms';

  const updateField = (fieldKey: string, nextValue: string) => {
    setActionForms((current) => ({
      ...current,
      [selectedActionKey]: {
        ...(current[selectedActionKey] || {}),
        [fieldKey]: nextValue,
      },
    }));
  };

  const resetCurrentAction = () => {
    setActionForms((current) => ({
      ...current,
      [selectedActionKey]: buildInitialGmailFormValues(selectedAction),
    }));
  };

  const openActionDetails = (actionKey: GmailActionKey) => {
    setSelectedActionKey(actionKey);
    setIsActionModalOpen(true);
  };

  return (
    <section
      data-connector={activeConnectorKey}
      className="flex h-full min-h-[760px] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/40"
    >
      <div className="border-b border-slate-100 bg-[#f8fafc] px-8 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Connector workspace</p>
            <h2 className="mt-2 text-[13px] font-black uppercase tracking-tight text-[#1a1c3d]">
              {isGoogleFormsConnector
                ? 'Google Forms automation workspace'
                : isGmailConnector
                  ? 'Gmail automation workspace'
                  : selectedCapability?.display_name || 'Automation workspace'}
            </h2>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
            {selectedCapability?.display_name || activeConnectorKey || 'Connector'}
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col gap-5 p-5">
        <div className="min-h-0 overflow-y-auto pr-1 custom-scrollbar">
          <div className="mx-auto w-full max-w-4xl">
            {isGoogleFormsConnector ? (
              <GoogleFormsConnectorFlow
                connectedEmail={connectedEmail}
                onConnectAccount={() => setIsConnectModalOpen(true)}
                onOpenConnectionDetails={() => setIsConnectionModalOpen(true)}
              />
            ) : (
              <GmailConnectorFlow
                selectedActionKey={selectedActionKey}
                connectedEmail={connectedEmail}
                onConnectAccount={() => setIsConnectModalOpen(true)}
                onOpenConnectionDetails={() => setIsConnectionModalOpen(true)}
                onSelectAction={openActionDetails}
              />
            )}
          </div>
        </div>
      </div>

      {isGmailConnector && isActionModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[32px] border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Action opened</p>
                <h3 className="mt-2 text-lg font-black text-[#1a1c3d]">{selectedAction.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsActionModalOpen(false)}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-violet-200 hover:text-violet-700"
                aria-label="Close action details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 md:p-6">
              <ActionDetailsPanel
                action={selectedAction}
                values={actionForms[selectedActionKey] || buildInitialGmailFormValues(selectedAction)}
                onChange={updateField}
                onCancel={() => {
                  resetCurrentAction();
                  setIsActionModalOpen(false);
                }}
                onSaveDraft={onSaveDraft}
              />
            </div>
          </div>
        </div>
      ) : null}

      {isConnectionModalOpen ? (
        <ConnectionDetailsModal
          open={isConnectionModalOpen}
          connectedEmail={connectedEmail}
          connectionState={connectionState}
          instance={instance}
          selectedCapability={selectedCapability}
          configuration={instance?.configuration || {
            connector_key: selectedConnectorKey || 'gmail',
            auth: {},
            settings: {},
            metadata: {},
          }}
          onClose={() => setIsConnectionModalOpen(false)}
        />
      ) : null}

      {isConnectModalOpen ? (
        <GoogleAccountChoiceModal
          open={isConnectModalOpen}
          connectorTitle={selectedCapability?.display_name || activeConnectorKey}
          onClose={() => setIsConnectModalOpen(false)}
          onConfirm={async (accountLabel, popup) => {
            setIsConnectModalOpen(false);
            await onConnectGoogleAccount(accountLabel, popup);
          }}
        />
      ) : null}
    </section>
  );
}
