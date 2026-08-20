"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Globe2,
  Image as ImageIcon,
  ListChecks,
  Send,
  Sparkles,
} from "lucide-react";
import { createAgentTask, getAgentTask, openTaskSocket, respondToPrompt } from "./api";
import type { HumanPrompt, TaskLog, TaskState } from "./types";

type Props = { initialApiBaseUrl: string };

export default function WebAutomationApp({ initialApiBaseUrl }: Props) {
  const [apiBaseUrl, setApiBaseUrl] = useState(initialApiBaseUrl);
  const [url, setUrl] = useState("");
  const [instruction, setInstruction] = useState("");
  const [task, setTask] = useState<TaskState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const taskRef = useRef<TaskState | null>(null);

  const taskId = task?.task_id || task?.taskId || "";
  const prompt = (task?.human_prompt || task?.prompt || null) as HumanPrompt | null;
  const status = String(task?.status || (task ? "running" : "ready"));
  const finished = ["done", "completed", "failed", "error"].includes(status.toLowerCase());

  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  const mergeEvent = useCallback((event: Record<string, unknown>) => {
    const current = taskRef.current || {};
    const action = [event.action, event.target].filter(Boolean).join(" → ");
    const eventLogs = Array.isArray(event.logs) ? event.logs as TaskLog[] : null;
    const nextLog: TaskLog = {
      type: String(event.type || "log"),
      action: action || undefined,
      message: String(event.message || event.result || action || "Agent update"),
    };
    const next: TaskState = {
      ...current,
      status: String(event.status || event.state || current.status || "running"),
      current_step: String(event.current_step || event.currentStep || current.current_step || ""),
      plan_summary: String(event.plan_summary || event.planSummary || current.plan_summary || ""),
      logs: eventLogs || [...(current.logs || current.log || []), nextLog],
      human_prompt: Object.hasOwn(event, "human_prompt")
        ? (event.human_prompt as HumanPrompt | null)
        : Object.hasOwn(event, "prompt")
          ? (event.prompt as HumanPrompt | null)
          : current.human_prompt || current.prompt || null,
      extraction_result: Object.hasOwn(event, "extraction_result")
        ? (event.extraction_result as TaskState["extraction_result"])
        : Object.hasOwn(event, "result")
          ? (event.result as TaskState["extraction_result"])
          : current.extraction_result || current.result || null,
      error: String(event.error || current.error || "") || null,
      success: typeof event.success === "boolean" ? event.success : current.success,
    };
    taskRef.current = next;
    setTask(next);
  }, []);

  useEffect(() => {
    if (!taskId) return;
    socketRef.current?.close();
    socketRef.current = openTaskSocket(taskId, mergeEvent, apiBaseUrl);
    return () => socketRef.current?.close();
  }, [apiBaseUrl, mergeEvent, taskId]);

  const start = async () => {
    const target = url.trim();
    if (!target) return setError("Please enter a portal URL.");
    try {
      new URL(target);
    } catch {
      return setError("The URL must be a valid absolute URL.");
    }

    setBusy(true);
    setError(null);
    try {
      const created = await createAgentTask(
        target,
        instruction.trim() || "Extract all available details from this page",
        apiBaseUrl,
      );
      setTask({ ...created.task, task_id: created.taskId, taskId: created.taskId });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start the task.");
    } finally {
      setBusy(false);
    }
  };

  const answerPrompt = async (value: unknown) => {
    if (!taskId || !prompt?.id) return;
    setBusy(true);
    try {
      await respondToPrompt(taskId, prompt.id, value, apiBaseUrl);
      setTask((current) => current ? { ...current, human_prompt: null, prompt: null } : current);
      setTask(await getAgentTask(taskId, apiBaseUrl));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to submit the response.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="web-automation-page relative min-h-screen overflow-hidden bg-bg-deep pt-20 text-text-primary">
      <div className="web-automation-grid" />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[1800px] flex-col px-4 py-6 md:px-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-bg-panel/90 p-4 backdrop-blur-xl">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent">Universal agent</p>
            <h1 className="mt-1 text-xl font-bold">Web Automation</h1>
          </div>
          <label className="flex min-w-72 flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-text-dim">
            Backend URL
            <input
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
              className="rounded-xl border border-border bg-bg-input px-3 py-2 text-sm font-normal normal-case tracking-normal text-text-primary outline-none focus:border-accent"
            />
          </label>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(360px,0.75fr)_minmax(420px,1fr)]">
          <TaskForm
            url={url}
            instruction={instruction}
            busy={busy && !task}
            error={error}
            onUrlChange={setUrl}
            onInstructionChange={setInstruction}
            onSubmit={() => void start()}
          />
          <div className="flex min-h-0 flex-col gap-4">
            <ProgressPanel task={task} status={status} finished={finished} paused={Boolean(prompt)} />
            {prompt ? <PromptCard prompt={prompt} busy={busy} onSubmit={answerPrompt} /> : null}
          </div>
        </div>
      </div>
    </main>
  );
}

function TaskForm(props: {
  url: string;
  instruction: string;
  busy: boolean;
  error: string | null;
  onUrlChange: (value: string) => void;
  onInstructionChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="panel-shell min-h-[480px]">
      <PanelHeader kicker="Automation mode" heading="Universal automation" icon={<Globe2 className="h-4 w-4" />} />
      <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
        <div className="rounded-2xl border border-border bg-bg-card/60 p-4">
          <p className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-text-dim">
            <Sparkles className="h-4 w-4 text-accent" /> Direct URL and instruction
          </p>
          <FieldLabel htmlFor="web-agent-url" label="URL" />
          <input id="web-agent-url" type="url" value={props.url} onChange={(e) => props.onUrlChange(e.target.value)}
            placeholder="https://example.com/portal" className="web-automation-input" />
          <FieldLabel htmlFor="web-agent-instruction" label="Instruction" extra="mt-4" />
          <textarea id="web-agent-instruction" value={props.instruction}
            onChange={(e) => props.onInstructionChange(e.target.value)}
            placeholder="Describe what the agent should do on the target page"
            className="web-automation-input min-h-32 resize-y" />
          {props.error ? <p className="mt-4 flex gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />{props.error}
          </p> : null}
        </div>
        <button type="button" disabled={props.busy} onClick={props.onSubmit}
          className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-bg-deep hover:bg-accent-light disabled:opacity-50">
          <Send className="h-4 w-4" />{props.busy ? "Starting task..." : "Start task"}
        </button>
      </div>
    </section>
  );
}

function ProgressPanel({ task, status, finished, paused }: { task: TaskState | null; status: string; finished: boolean; paused: boolean }) {
  const logs = task?.logs || task?.log || [];
  const result = task?.extraction_result || task?.result;
  return (
    <section className="panel-shell min-h-[360px] flex-1">
      <PanelHeader kicker="Live execution" heading="Agent progress" icon={<ListChecks className="h-4 w-4" />} />
      <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-card/60 p-3">
          {finished ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Clock3 className="h-5 w-5 text-accent" />}
          <div><p className="text-xs font-bold uppercase text-text-primary">{paused ? "Waiting for input" : status}</p>
          <p className="text-xs text-text-dim">{task?.current_step || task?.currentStep || task?.plan_summary || task?.planSummary || "No task started yet."}</p></div>
        </div>
        <div className="space-y-2">
          {logs.map((log, index) => <div key={index} className="rounded-xl border border-border bg-bg-input/70 p-3 text-sm text-text-secondary">
            <span className="mr-2 text-[10px] font-black uppercase text-accent">{log.type || "log"}</span>
            {log.message || log.result || log.action || "Agent update"}
          </div>)}
          {!logs.length ? <p className="rounded-xl border border-dashed border-border p-4 text-sm text-text-dim">Agent events will appear here.</p> : null}
        </div>
        {result ? <pre className="overflow-auto rounded-xl border border-border bg-bg-input p-4 text-xs text-text-secondary">{JSON.stringify(result.data ?? result, null, 2)}</pre> : null}
        {task?.error ? <p className="text-sm text-danger">{task.error}</p> : null}
      </div>
    </section>
  );
}

function PromptCard({ prompt, busy, onSubmit }: { prompt: HumanPrompt; busy: boolean; onSubmit: (value: unknown) => Promise<void> }) {
  const [value, setValue] = useState("");
  const imageUrl = prompt.screenshotUrl || prompt.captchaContext?.imageUrl;
  const label = prompt.text || prompt.prompt || prompt.message || "The agent needs your input to continue.";
  return (
    <section className="rounded-2xl border border-warning/40 bg-bg-panel p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-warning"><AlertCircle className="h-4 w-4" />Human input required</p>
      <p className="mb-3 text-sm text-text-secondary">{label}</p>
      {imageUrl ? <div className="mb-3 flex items-center gap-2 text-xs text-text-dim"><ImageIcon className="h-4 w-4" />
        {/* CAPTCHA and live browser screenshots can be data URLs or backend URLs unknown at build time. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={prompt.captchaContext?.alt || "Agent prompt"} className="max-h-44 rounded-lg" /></div> : null}
      {prompt.options?.length ? <div className="flex flex-wrap gap-2">{prompt.options.map((option) =>
        <button key={option} disabled={busy} onClick={() => void onSubmit(option)} className="rounded-lg border border-accent px-3 py-2 text-sm text-accent">{option}</button>)}</div> :
        <div className="flex gap-2"><input value={value} onChange={(e) => setValue(e.target.value)} className="web-automation-input" />
        <button disabled={busy || !value.trim()} onClick={() => void onSubmit(value)} className="rounded-xl bg-warning px-4 py-2 text-sm font-bold text-bg-deep disabled:opacity-50">Continue</button></div>}
    </section>
  );
}

function PanelHeader({ kicker, heading, icon }: { kicker: string; heading: string; icon: ReactNode }) {
  return <div className="panel-header-shell"><div className="panel-title-shell"><span className="text-accent">{icon}</span><div><p className="panel-kicker">{kicker}</p><h2 className="panel-heading">{heading}</h2></div></div></div>;
}

function FieldLabel({ htmlFor, label, extra = "" }: { htmlFor: string; label: string; extra?: string }) {
  return <label htmlFor={htmlFor} className={`mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-text-dim ${extra}`}>{label}</label>;
}
