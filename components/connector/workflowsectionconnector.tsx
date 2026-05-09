'use client';

import React, { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, MarkerType, useEdgesState, useNodesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { ArrowRight, Database, Sparkles, Workflow } from 'lucide-react';
import CustomNode from '../shared/workflow/CustomNode';
import FlowArrowEdge from '../shared/workflow/FlowArrowEdge';
import {
  ConnectorCapability,
  ConnectorRegistryResponse,
  ConnectorStepStatus,
  ConnectorWorkflowDraft,
  ConnectorWorkflowStep,
  MissingField,
} from '../../types/api';
import { getLayoutedElements } from '../../lib/utils';
import { WorkflowData } from '../../types/agents';

interface WorkflowSectionConnectorProps {
  draft: ConnectorWorkflowDraft | null;
  registry: ConnectorRegistryResponse | null;
  selectedConnectorKey: string | null;
  onSelectConnectorKey?: (connectorKey: string) => void;
  onSelectStep?: (step: ConnectorWorkflowStep | null) => void;
}

const nodeTypes = {
  input: CustomNode,
  default: CustomNode,
  decision: CustomNode,
  output: CustomNode,
};

const edgeTypes = {
  smoothstep: FlowArrowEdge,
};

function statusToNodeStatus(status?: ConnectorStepStatus | string) {
  switch (status) {
    case 'published':
    case 'tested':
      return 'Done';
    case 'needs_auth':
    case 'needs_config':
    case 'warning':
      return 'Needs review';
    default:
      return 'In Progress';
  }
}

function stepToNodeType(step: ConnectorWorkflowStep) {
  switch (step.step_type) {
    case 'prompt':
      return 'input';
    case 'condition':
      return 'decision';
    case 'publish':
    case 'output':
      return 'output';
    default:
      return 'default';
  }
}

function normalizeMissingField(field: MissingField | string, fallbackStepId?: string): MissingField {
  if (typeof field === 'string') {
    return {
      key: field,
      label: field.replace(/[._-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
      description: null,
      required: true,
      step_id: fallbackStepId || null,
      value: null,
    };
  }

  return field;
}

function getStepMissingFields(step: ConnectorWorkflowStep | null): MissingField[] {
  if (!step) return [];
  return (step.missing_fields || []).map((field) => normalizeMissingField(field, step.step_id));
}

function stepSummary(step: ConnectorWorkflowStep) {
  const operation = step.action_key || step.trigger_key || step.service_key || 'operation';
  return [step.connector_key, step.service_key, operation].filter(Boolean).join(' · ');
}

function stepAgentLabel(step: ConnectorWorkflowStep, index: number) {
  return step.agent_role || `Agent ${index + 1}`;
}

function stepAgentTask(step: ConnectorWorkflowStep) {
  return step.agent_task || 'Complete the connector step.';
}

function buildWorkflowData(draft: ConnectorWorkflowDraft | null): WorkflowData | null {
  if (!draft || !draft.steps.length) return null;

  const nodes = draft.steps.map((step, index) => {
    const missingCount = getStepMissingFields(step).length;
    const agentLabel = stepAgentLabel(step, index);
    const agentTask = stepAgentTask(step);
    return {
      id: step.step_id,
      type: stepToNodeType(step) as 'input' | 'default' | 'decision' | 'output',
      data: {
        label: `${agentLabel}: ${step.label}`,
        description: `${agentTask}${step.description ? ` · ${step.description}` : ''}`,
        owner: step.connector_key,
        duration: missingCount ? `${missingCount} missing` : 'Ready',
        status: statusToNodeStatus(step.status),
        highlighted: index === 0,
      },
    };
  });

  const edges = draft.steps.slice(1).map((step, index) => ({
    id: `${draft.steps[index].step_id}-${step.step_id}`,
    source: draft.steps[index].step_id,
    target: step.step_id,
    label: step.action_key || step.trigger_key || step.step_type,
    animated: draft.can_execute,
  }));

  return { nodes, edges };
}

function CapabilityPill({
  capability,
  active,
  onClick,
}: {
  capability: ConnectorCapability;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-left transition-all ${
        active ? 'border-indigo-200 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-200'
      }`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">{capability.connector_key}</p>
      <p className="mt-2 text-sm font-black text-[#1a1c3d]">{capability.display_name}</p>
      <p className="mt-1 text-xs text-slate-500">
        {capability.services.length} services, {capability.triggers.length} triggers, {capability.actions.length} actions
      </p>
    </button>
  );
}

function formatMissingFields(fields: MissingField[]) {
  if (!fields.length) return 'No required fields are missing.';
  return fields
    .map((field) => field.label || field.key)
    .slice(0, 3)
    .join(', ');
}

function formatAgentLine(step: ConnectorWorkflowStep, index: number) {
  const agentLabel = stepAgentLabel(step, index);
  const agentTask = stepAgentTask(step);
  return `${agentLabel} · ${agentTask}`;
}

export default function WorkflowSectionConnector({
  draft,
  registry,
  selectedConnectorKey,
  onSelectConnectorKey,
  onSelectStep,
}: WorkflowSectionConnectorProps) {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const workflowData = useMemo(() => buildWorkflowData(draft), [draft]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!workflowData) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      workflowData.nodes,
      workflowData.edges.map((edge) => ({
        ...edge,
        type: 'smoothstep',
        animated: edge.animated !== false,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#525ceb' },
      })),
      'LR'
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [workflowData, setEdges, setNodes]);

  const selectedStep = useMemo(
    () => draft?.steps.find((step) => step.step_id === selectedStepId) || draft?.steps[0] || null,
    [draft, selectedStepId]
  );

  useEffect(() => {
    onSelectStep?.(selectedStep);
  }, [onSelectStep, selectedStep]);

  const selectedCapability = useMemo(() => {
    if (!registry || !selectedConnectorKey) return null;
    return registry.connectors.find((item) => item.connector_key === selectedConnectorKey) || null;
  }, [registry, selectedConnectorKey]);

  const normalizedMissingFields = useMemo(() => {
    const draftFields = (draft?.missing_fields || []).map((field) => normalizeMissingField(field));
    const stepFields = (draft?.steps || []).flatMap((step) => getStepMissingFields(step));
    return [...draftFields, ...stepFields];
  }, [draft]);

  return (
    <section className="connector-panel flex h-full min-h-[620px] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/40">
      <div className="connector-panel-header border-b border-slate-100 bg-[#f8fafc] px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
              <Workflow className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Step 2</p>
              <h2 className="mt-1 text-[13px] font-black uppercase tracking-tight text-[#1a1c3d]">Workflow Builder</h2>
            </div>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
            {draft?.can_execute ? 'Executable draft' : 'Needs config'}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-8">
        <div className="connector-card rounded-[1.75rem] border border-slate-200 bg-[#f8fafc] p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#525ceb]" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Backend draft</p>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Workflow</p>
                  <h3 className="mt-2 text-lg font-black text-[#1a1c3d]">{draft?.workflow_name || 'Waiting for a prompt'}</h3>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                    draft?.can_execute ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'
                  }`}
                >
                  {draft?.can_execute ? 'Ready' : 'Needs fields'}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {draft?.description || 'Use the prompt planner to generate a connector workflow from capability metadata.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(draft?.connector_refs || []).map((ref) => (
                  <span
                    key={`${ref.connector_key}-${ref.service_key || 'service'}-${ref.trigger_key || ref.action_key || 'op'}`}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500"
                  >
                    {ref.display_name || ref.connector_key}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-indigo-600" />
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Missing fields</p>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{formatMissingFields(normalizedMissingFields)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {normalizedMissingFields.slice(0, 4).map((field) => (
                  <span
                    key={field.key}
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700"
                  >
                    {field.label || field.key}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {workflowData ? (
            <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Workflow graph</p>
                  <h4 className="mt-1 text-sm font-black text-[#1a1c3d]">{draft?.steps.length || 0} backend-planned steps</h4>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {draft?.confidence ? `${Math.round(draft.confidence * 100)}% confidence` : 'Planner output'}
                </span>
              </div>

              <div className="relative h-[460px] bg-white">
                <div
                  className="absolute inset-0 pointer-events-none opacity-[0.35]"
                  style={{
                    backgroundImage:
                      'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                  }}
                />
                {nodes.length > 0 ? (
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.3 }}
                    className="relative z-10"
                    onNodeClick={(_, node) => {
                      const next = draft?.steps.find((step) => step.step_id === node.id) || null;
                      if (!next) return;
                      setSelectedStepId(next.step_id);
                      onSelectStep?.(next);
                    }}
                  >
                    <Background color="#cbd5e1" gap={40} size={1} />
                    <Controls className="dashboard-controls overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl" />
                  </ReactFlow>
                ) : (
                  <div className="relative z-10 flex h-full items-center justify-center p-6 text-center">
                    <div>
                      <Sparkles className="mx-auto h-6 w-6 text-slate-400" />
                      <p className="mt-3 text-sm font-semibold text-slate-600">No workflow nodes to render yet.</p>
                    </div>
                  </div>
                )}
              </div>

              {draft?.notes?.length ? (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
                  {draft.notes[0]}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <Workflow className="mx-auto h-6 w-6 text-slate-500" />
              <h4 className="mt-4 text-lg font-black text-[#1a1c3d]">Prompt for a workflow draft</h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                The planner will map the prompt into connector-aware steps as soon as a draft is returned.
              </p>
            </div>
          )}

          <div className="mt-5 grid gap-3 md:grid-cols-2">
              {draft?.steps.map((step, index) => {
                const active = step.step_id === selectedStepId;
                const stepMissingFields = getStepMissingFields(step);
                const agentLabel = stepAgentLabel(step, index);
                return (
                  <button
                    key={step.step_id}
                    type="button"
                    onClick={() => {
                    setSelectedStepId(step.step_id);
                    onSelectStep?.(step);
                    onSelectConnectorKey?.(step.connector_key);
                  }}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                    active ? 'border-indigo-200 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">
                          {agentLabel}
                        </p>
                        <h4 className="mt-2 text-sm font-black text-[#1a1c3d]">{step.label}</h4>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">{formatAgentLine(step, index)}</p>
                      </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {step.status || 'ready'}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {step.connector_key}
                    </span>
                    {step.service_key ? (
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {step.service_key}
                      </span>
                    ) : null}
                    {step.action_key ? (
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {step.action_key}
                      </span>
                    ) : null}
                    {stepMissingFields.length ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                        {stepMissingFields.length} missing
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedStep ? (
            <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Selected step</p>
                  <h4 className="mt-1 text-sm font-black text-[#1a1c3d]">{selectedStep.label}</h4>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
                    {stepAgentLabel(selectedStep, 0)} · {selectedStep.step_type}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {stepAgentTask(selectedStep)}
                {selectedStep.description ? ` · ${selectedStep.description}` : ` · ${stepSummary(selectedStep)}`}
              </p>
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Agent responsibility</p>
                <p className="mt-2 font-semibold text-[#1a1c3d]">{selectedStep.agent_role || 'Unassigned agent'}</p>
                <p className="mt-1 leading-relaxed text-slate-600">
                  {selectedStep.agent_task || 'No task description was provided for this step.'}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {getStepMissingFields(selectedStep).map((field) => (
                  <span
                    key={field.key}
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700"
                  >
                    {field.label || field.key}
                  </span>
                ))}
                {!getStepMissingFields(selectedStep).length ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    Ready
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {registry?.connectors.length ? (
          <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Available connectors</p>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                Capability-driven
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {registry.connectors.map((capability) => (
                <CapabilityPill
                  key={capability.connector_key}
                  capability={capability}
                  active={capability.connector_key === selectedConnectorKey}
                  onClick={() => onSelectConnectorKey?.(capability.connector_key)}
                />
              ))}
            </div>
            {selectedCapability ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Selected capability</p>
                <p className="mt-2 font-black text-[#1a1c3d]">{selectedCapability.display_name}</p>
                <p className="mt-1">
                  Auth: {selectedCapability.auth_type} · Modes: {selectedCapability.execution_modes.join(', ') || 'manual'}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="connector-panel-footer border-t border-slate-100 bg-white px-8 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">
        {draft?.can_execute ? 'Backend-ready workflow draft' : 'Planner output awaiting required fields'}
      </div>
    </section>
  );
}
