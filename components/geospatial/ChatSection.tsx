'use client';

import React, { useState, useRef, useEffect } from 'react';
import OpenAI from 'openai';
import { Send, Bot, User, Loader2, Maximize2, Square, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, WorkflowData as WorkflowJson, MarkerData as Marker } from '@/lib/dashboard/geospatial/types';

interface ChatSectionProps {
  onAiResponse?: (content: string) => void;
  onWorkflowGenerated?: (workflow: WorkflowJson) => void;
  onWorkflowGenerating?: (loading: boolean) => void;
  onMarkersFound?: (markers: Marker[]) => void;
  onToggle?: () => void;
  isCollapsed?: boolean;
}

const client = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || 'MISSING_KEY',
  dangerouslyAllowBrowser: true,
});

const MODEL = 'gpt-4o-mini';

// const SYSTEM_PROMPT = `You are an AI assistant with access to web search. Follow these rules strictly:

// 1. Workflow generation:
// - When the user asks to create a workflow, first explain it step by step in simple language.
// - After the explanation, include a JSON code block with language "json".
// - The JSON must define nodes and edges for a node-based workflow editor.

// 2. Location queries:
// - For any query mentioning a location, city, address, building, real estate project, or place, include coordinates.
// - Format exactly:
// Coordinates: latitude: X.XXXX° N/S, longitude: Y.YYYY° E/W
// - If unavailable, say coordinates are unavailable.

// 3. Other queries:
// - Answer normally.

// Example workflow JSON:
// {
//   "nodes": [
//     { "id": "start", "type": "input", "data": { "label": "Start" } },
//     { "id": "decision", "type": "decision", "data": { "label": "Check" } },
//     { "id": "end", "type": "output", "data": { "label": "End" } }
//   ],
//   "edges": [
//     { "id": "e1", "source": "start", "target": "decision" },
//     { "id": "e2", "source": "decision", "target": "end" }
//   ]
// }`;

const SYSTEM_PROMPT = `You are an AI assistant with access to web search. Follow these rules strictly:

1. **Workflow generation**: When the user asks to create a workflow, do the following:
   - First, provide a friendly, step‑by‑step explanation of what the workflow does, using simple language. Describe each step, any decisions (if/else branches), and how they connect.
   - After the explanation, include a JSON code block that defines the workflow nodes and edges for a node‑based workflow editor. The JSON must be inside a code block with language "json".
   - The JSON structure must follow the example given at the end of this prompt.

2. **Location queries**: For ANY query that mentions a location (city, place, address, building, real estate project, etc.), you MUST include the coordinates in your response. Use the web search tool to find the exact coordinates if you don't know them.
   - Format: "Coordinates: latitude: X.XXXX° N/S, longitude: Y.YYYY° E/W" on its own line.
   - Example: "Coordinates: latitude: 18.5597° N, longitude: 73.7799° E"
   - Do NOT omit coordinates. If you cannot find them, state that coordinates are unavailable.

3. **Other queries**: If neither condition applies, answer normally.

Example workflow JSON:
{
  "nodes": [
    { "id": "start", "type": "input", "data": { "label": "Start" } },
    { "id": "check_condition", "type": "decision", "data": { "label": "Is condition met?" } },
    { "id": "true_branch", "type": "default", "data": { "label": "Process A" } },
    { "id": "false_branch", "type": "default", "data": { "label": "Process B" } },
    { "id": "end", "type": "output", "data": { "label": "End" } }
  ],
  "edges": [
    { "id": "e-start-check", "source": "start", "target": "check_condition" },
    { "id": "e-check-true", "source": "check_condition", "target": "true_branch", "label": "Yes" },
    { "id": "e-check-false", "source": "check_condition", "target": "false_branch", "label": "No" },
    { "id": "e-true-end", "source": "true_branch", "target": "end" },
    { "id": "e-false-end", "source": "false_branch", "target": "end" }
  ]
}`;
const extractCoordinates = (text: string): Marker[] => {
  const markers: Marker[] = [];

  const explicitPairs = [
    ...text.matchAll(/lat(?:itude)?:\s*([-+]?\d*\.?\d+)\s*[,;]\s*lng(?:itude)?:\s*([-+]?\d*\.?\d+)/gi),
    ...text.matchAll(/latitude:\s*([-+]?\d*\.?\d+)\s*[,;]\s*longitude:\s*([-+]?\d*\.?\d+)/gi),
    ...text.matchAll(/\(([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)\)/g),
    ...text.matchAll(/([-+]?\d{1,3}\.\d+)\s*,\s*([-+]?\d{1,3}\.\d+)/g),
  ];

  for (const match of explicitPairs) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);

    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      const context = text.substring(
        Math.max(0, (match.index || 0) - 50),
        Math.min(text.length, (match.index || 0) + match[0].length + 50)
      );

      markers.push({ lat, lng, context: context.trim() });
    }
  }

  const latMatches = [...text.matchAll(/(\d+\.\d+)\s*°?\s*([NS])(?:\s*(?:latitude|lat))?/gi)];
  const lngMatches = [...text.matchAll(/(\d+\.\d+)\s*°?\s*([EW])(?:\s*(?:longitude|lng|lon))?/gi)];

  const minLen = Math.min(latMatches.length, lngMatches.length);

  for (let i = 0; i < minLen; i++) {
    const latMatch = latMatches[i];
    const lngMatch = lngMatches[i];

    let lat = parseFloat(latMatch[1]);
    let lng = parseFloat(lngMatch[1]);

    if (latMatch[2]?.toUpperCase() === 'S') lat = -lat;
    if (lngMatch[2]?.toUpperCase() === 'W') lng = -lng;

    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      const start = Math.min(latMatch.index || 0, lngMatch.index || 0);
      const end = Math.max(
        (latMatch.index || 0) + latMatch[0].length,
        (lngMatch.index || 0) + lngMatch[0].length
      );
      const context = text.substring(Math.max(0, start - 50), Math.min(text.length, end + 50)).trim();
      markers.push({ lat, lng, context });
    }
  }

  const unique: Marker[] = [];
  const seen = new Set<string>();

  for (const marker of markers) {
    const key = `${Math.round(marker.lat * 1e5)}_${Math.round(marker.lng * 1e5)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(marker);
    }
  }

  return unique;
};

const extractCoordinatesWithIndex = (text: string) => {
  const markers: Array<{ lat: number; lng: number; index: number }> = [];

  const patterns = [
    /lat(?:itude)?:\s*([-+]?\d*\.?\d+)\s*[,;]\s*lng(?:itude)?:\s*([-+]?\d*\.?\d+)/gi,
    /latitude:\s*([-+]?\d*\.?\d+)\s*[,;]\s*longitude:\s*([-+]?\d*\.?\d+)/gi,
    /\(([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)\)/g,
    /([-+]?\d{1,3}\.\d+)\s*,\s*([-+]?\d{1,3}\.\d+)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);

      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        markers.push({ lat, lng, index: match.index });
      }
    }
  }

  const latMatches = [...text.matchAll(/(\d+\.\d+)\s*°?\s*([NS])(?:\s*(?:latitude|lat))?/gi)];
  const lngMatches = [...text.matchAll(/(\d+\.\d+)\s*°?\s*([EW])(?:\s*(?:longitude|lng|lon))?/gi)];
  const minLen = Math.min(latMatches.length, lngMatches.length);

  for (let i = 0; i < minLen; i++) {
    const latMatch = latMatches[i];
    const lngMatch = lngMatches[i];

    let lat = parseFloat(latMatch[1]);
    let lng = parseFloat(lngMatch[1]);

    if (latMatch[2]?.toUpperCase() === 'S') lat = -lat;
    if (lngMatch[2]?.toUpperCase() === 'W') lng = -lng;

    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      const start = Math.min(latMatch.index || 0, lngMatch.index || 0);
      markers.push({ lat, lng, index: start });
    }
  }

  const unique: Array<{ lat: number; lng: number; index: number }> = [];
  const seen = new Set<string>();

  for (const marker of markers) {
    const key = `${Math.round(marker.lat * 1e5)}_${Math.round(marker.lng * 1e5)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(marker);
    }
  }

  return unique;
};

const extractAddress = (text: string, coordIndex: number, maxLinesBefore = 15) => {
  const lines = text.split('\n');
  let lineIdx = -1;
  let cumulative = 0;

  for (let i = 0; i < lines.length; i++) {
    cumulative += lines[i].length + 1;
    if (cumulative > coordIndex) {
      lineIdx = i;
      break;
    }
  }

  if (lineIdx === -1) return 'Location';

  const candidates: Array<{ line: string; score: number }> = [];

  for (let i = Math.max(0, lineIdx - maxLinesBefore); i < lineIdx; i++) {
    const line = lines[i].trim();

    if (line.length < 5 || line.length > 200) continue;
    if (/Coordinates|latitude|longitude/i.test(line)) continue;

    let score = 0;

    if (line.match(/[A-Za-z]+,?\s+(?:Pune|Mumbai|Delhi|Bangalore|Chennai|Hyderabad|Kolkata|Ahmedabad|Surat)/i)) {
      score += 3;
    }

    if (/^[A-Za-z0-9\s]+$/i.test(line) && line.split(' ').length <= 8 && !/^\d/.test(line)) {
      score += 2;
    }

    if (line.length < 80 && !/^-/.test(line) && !/₹|\d+\s*lakh|\d+\s*crore/i.test(line)) {
      score += 1;
    }

    if (score > 0) {
      candidates.push({ line, score });
    }
  }

  if (candidates.length) {
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].line;
  }

  for (let i = 0; i < Math.min(lineIdx, 15); i++) {
    const line = lines[i].trim();
    if (line.length > 5 && !/Coordinates|latitude|longitude/i.test(line)) {
      return line;
    }
  }

  return 'Location';
};

const extractInsight = (text: string, coordIndex: number, contextRadius = 500) => {
  const start = Math.max(0, coordIndex - contextRadius);
  const end = Math.min(text.length, coordIndex + contextRadius);
  const snippet = text.substring(start, end);

  const insights: string[] = [];

  const priceMatch =
    snippet.match(/₹\s?(\d+\.?\d*)\s*(\w+)?\s*[-–]\s*₹\s?(\d+\.?\d*)\s*(\w+)?/i) ||
    snippet.match(/₹\s?(\d+\.?\d*)\s*(\w+)?\s*(?:to|–|-)\s*₹\s?(\d+\.?\d*)\s*(\w+)?/i) ||
    snippet.match(/₹\s?(\d+\.?\d*)\s*(\w+)?/i);

  if (priceMatch) insights.push(`Price: ${priceMatch[0]}`);

  const areaMatch = snippet.match(/(\d+(?:[.,]\d+)?)\s*(?:sq\.?\s?ft|sq\.?\s?m|square\s?feet|sq\s?ft)/i);
  if (areaMatch) insights.push(`Area: ${areaMatch[0]}`);

  const statusMatch = snippet.match(/\b(Under Construction|Completed|Ready to Move|Sold Out|Launched|Upcoming)\b/i);
  if (statusMatch) insights.push(`Status: ${statusMatch[0]}`);

  const devMatch = snippet.match(/(?:Developer|Builder|Project by)\s*:\s*([A-Za-z\s]+)/i);
  if (devMatch) insights.push(`Developer: ${devMatch[1].trim()}`);

  const amenityMatch = snippet.match(/Amenities:\s*([^.]+)/i);
  if (amenityMatch) {
    const amenities = amenityMatch[1].trim().slice(0, 60);
    insights.push(`Amenities: ${amenities}${amenities.length >= 60 ? '…' : ''}`);
  }

  if (insights.length === 0) {
    const sentences = snippet.split(/[.!?]+/);
    for (const sent of sentences) {
      if (sent.length > 20 && sent.length < 200 && /₹|sq\.|price|area|project|property/i.test(sent)) {
        insights.push(sent.trim());
        break;
      }
    }
  }

  return insights.length ? insights.join(' | ') : `${snippet.slice(0, 120).trim()}…`;
};

const geocodeLocation = async (locationName: string): Promise<Marker | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1`
    );
    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        address: locationName,
        insight: 'Location from geocoding',
      };
    }
  } catch (error) {
    console.error('Geocoding failed:', error);
  }

  return null;
};

const ChatSection: React.FC<ChatSectionProps> = ({
  onAiResponse,
  onWorkflowGenerated,
  onWorkflowGenerating,
  onMarkersFound,
  onToggle,
  isCollapsed,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [totalTokens, setTotalTokens] = useState(0);
  const [workflowJson, setWorkflowJson] = useState<WorkflowJson | null>(null);
  const [showJsonModal, setShowJsonModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<any>(null);
  const isWorkflowRequestRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 100)}px`;
  }, [input]);

  const enrichMarkersWithIndices = async (text: string, markers: Marker[]): Promise<Marker[]> => {
    const markersWithIndex = extractCoordinatesWithIndex(text);
    const enriched: Marker[] = [];

    for (const marker of markers) {
      let best: { marker: { lat: number; lng: number; index: number }; dist: number } | null = null;

      for (const indexedMarker of markersWithIndex) {
        const dist = Math.abs(indexedMarker.lat - marker.lat) + Math.abs(indexedMarker.lng - marker.lng);
        if (best === null || dist < best.dist) {
          best = { marker: indexedMarker, dist };
        }
      }

      if (best && best.dist < 0.0001) {
        const address = extractAddress(text, best.marker.index);
        const insight = extractInsight(text, best.marker.index);

        enriched.push({
          lat: marker.lat,
          lng: marker.lng,
          address,
          insight,
          context: marker.context,
        });
      } else {
        enriched.push({ ...marker, address: 'Location', insight: '' });
      }
    }

    return enriched;
  };

  const handleSend = async () => {
    const query = input.trim();
    if (!query || isStreaming) return;

    const isWorkflow =
      query.toLowerCase().includes('workflow') ||
      query.toLowerCase().includes('create a workflow');

    isWorkflowRequestRef.current = isWorkflow;

    if (isWorkflow && onWorkflowGenerating) {
      onWorkflowGenerating(true);
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setIsStreaming(true);
    setStreamingText('');

    const apiInput = history.map(({ role, content }) => ({ role, content }));

    try {
      const stream = await client.responses.create({
        model: MODEL,
        input: apiInput,
        stream: true,
        max_output_tokens: 2048,
        tools: [{ type: 'web_search_preview' }],
        instructions: SYSTEM_PROMPT,
      });

      abortRef.current = stream.controller;

      let fullText = '';

      for await (const event of stream) {
        if (event.type === 'response.output_text.delta') {
          const delta = event.delta ?? '';
          fullText += delta;

          let displayText = fullText;
          if (isWorkflow) {
            const jsonStartIndex = fullText.indexOf('```json');
            if (jsonStartIndex !== -1) {
              displayText = fullText.substring(0, jsonStartIndex).trim();
            }
          }

          setStreamingText(displayText);
          setTotalTokens((prev) => prev + Math.ceil(delta.length / 4));
        }
      }

      let cleanedText = fullText;
      let parsedWorkflowData: WorkflowJson | null = null;

      const jsonMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch?.[1]) {
        try {
          parsedWorkflowData = JSON.parse(jsonMatch[1]);

          if (parsedWorkflowData && parsedWorkflowData.nodes && parsedWorkflowData.edges) {
            onWorkflowGenerated?.(parsedWorkflowData);
            setWorkflowJson(parsedWorkflowData);
            cleanedText = fullText.replace(/```json\s*[\s\S]*?\s*```/, '').trim();
          }
        } catch (error) {
          console.error('Failed to parse workflow JSON', error);
        }
      }

      if (isWorkflow && !cleanedText) {
        cleanedText =
          "I've generated a workflow for you. You can view the JSON by clicking the 'View JSON' button below.";
      }

      const finalAssistantText = cleanedText || fullText;

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: finalAssistantText,
          timestamp: Date.now(),
        },
      ]);

      onAiResponse?.(finalAssistantText);

      let markers = extractCoordinates(finalAssistantText);

      if (markers.length === 0) {
        const geocoded = await geocodeLocation(query);
        if (geocoded) {
          markers = [geocoded];
        }
      } else {
        markers = await enrichMarkersWithIndices(finalAssistantText, markers);
      }

      if (markers.length > 0) {
        onMarkersFound?.(markers);
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `Error: ${error?.message || 'Something went wrong. Check your API key.'}`,
            timestamp: Date.now(),
          },
        ]);
      }
    } finally {
      setIsStreaming(false);
      setStreamingText('');
      abortRef.current = null;

      if (isWorkflowRequestRef.current) {
        onWorkflowGenerating?.(false);
        isWorkflowRequestRef.current = false;
      }
    }
  };

  const handleStop = () => {
    abortRef.current?.abort?.();
  };

  const handleClear = () => {
    setMessages([]);
    setStreamingText('');
    setTotalTokens(0);
    setWorkflowJson(null);
    setShowJsonModal(false);
  };

  const renderMarkdown = (content: string) => (
    <div className="prose prose-invert max-w-none break-words text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 underline hover:text-indigo-300"
            >
              {children}
            </a>
          ),
          code(props: any) {
            const { inline, className, children, ...rest } = props;
            const match = /language-(\w+)/.exec(className || '');

            if (!inline && match) {
              return (
                <pre className="my-2 overflow-x-auto rounded-lg border border-white/10 bg-slate-900/70 p-3">
                  <code className={className} {...rest}>
                    {children}
                  </code>
                </pre>
              );
            }

            return (
              <code className="rounded bg-slate-900/70 px-1.5 py-0.5 text-[12px] text-indigo-300" {...rest}>
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-4 border-indigo-500 pl-4 italic text-slate-400">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );

  return (
    <>
      <div className={`workspace-panel flex h-full w-full flex-col bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden transition-all duration-500 ${isCollapsed ? 'opacity-80' : 'opacity-100'}`}>
        <div className="workspace-panel-header flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight leading-none">AI Assistant</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  {MODEL}
                </span>
                <div className="h-1 w-1 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none">
                  Online
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {workflowJson && (
              <button
                onClick={() => setShowJsonModal(true)}
                className="p-1 px-3 text-[10px] font-bold text-indigo-500 hover:bg-indigo-50 rounded-full border border-indigo-100 uppercase tracking-widest transition-all"
              >
                Source JSON
              </button>
            )}
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                className="rounded-lg border border-slate-100 p-2 text-slate-400 transition-colors hover:text-slate-600"
                title="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onToggle}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              <Maximize2 className={`h-4 w-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        <div className="workspace-scroll flex-1 overflow-y-auto p-5 scrollbar-thin">
          {messages.length === 0 && !isStreaming ? (
            <div className="flex h-full flex-col items-center justify-center text-center animate-in fade-in duration-700">
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full bg-indigo-500/5 animate-pulse blur-xl" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-2xl border border-slate-100">
                  <Bot className="h-10 w-10 text-indigo-500/40" />
                </div>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">How can I help you?</h3>
              <p className="mt-2.5 max-w-[240px] text-xs font-bold text-slate-400 uppercase tracking-[0.2em] leading-relaxed">
                AI DRIVEN ANALYTICS & WORKFLOWS
              </p>
              <p className="mt-4 max-w-[280px] text-sm font-medium text-slate-500 leading-relaxed">
                Ask anything, I can answer, generate workflows, and detect location coordinates.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  <div
                    className={`flex max-w-[85%] gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                  >
                    <div
                      className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${m.role === 'user'
                        ? 'border-indigo-100 bg-indigo-50 text-indigo-600'
                        : 'border-slate-100 bg-slate-50 text-slate-400'
                        }`}
                    >
                      {m.role === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>

                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${m.role === 'user'
                        ? 'bg-indigo-600 text-white shadow-indigo-100'
                        : 'border border-slate-100 bg-slate-50 text-slate-700'
                        }`}
                    >
                      {m.role === 'user' ? m.content : renderMarkdown(m.content)}
                    </div>
                  </div>
                </div>
              ))}

              {isStreaming && (
                <div className="flex justify-start animate-in fade-in duration-300">
                  <div className="flex max-w-[85%] gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800">
                      <Bot className="h-4 w-4 text-slate-300" />
                    </div>

                    {streamingText ? (
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-slate-700 shadow-sm">
                        {renderMarkdown(streamingText)}
                        <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-400 animate-pulse rounded-full align-middle" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 shadow-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Processing...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {(totalTokens > 0) && (
          <div className="flex items-center justify-between px-6 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            <div className="flex items-center gap-2">
              {totalTokens > 0 && <span>~{totalTokens} tokens</span>}
              {totalTokens > 0 && <span>•</span>}
              <span>{messages.filter((m) => m.role === 'user').length} interaction nodes</span>
            </div>
          </div>
        )}

        <div className="workspace-panel-footer p-6 bg-slate-50/30 border-t border-slate-100">
          <div className="workspace-input-wrap relative flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-inner-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your instruction..."
              disabled={isStreaming}
              className="max-h-[100px] min-h-[22px] flex-1 resize-none bg-transparent px-4 py-2 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />

            <button
              onClick={isStreaming ? handleStop : handleSend}
              disabled={!isStreaming && !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:opacity-40"
              title={isStreaming ? 'Stop generation' : 'Send message'}
            >
              {isStreaming ? <Bot className="h-4 w-4 animate-pulse" /> : <Send className="h-4.5 w-4.5" />}
            </button>
          </div>

          <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Press Enter to send · Shift + Enter For Newline
          </p>
        </div>
      </div>

      {showJsonModal && workflowJson && (
          <div className="workspace-modal fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="workspace-modal-card h-[80vh] w-full max-w-4xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="workspace-panel-header flex items-center justify-between border-b border-slate-100 px-8 py-6">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Workflow Definition Logic</h2>
              <button
                onClick={() => setShowJsonModal(false)}
                className="rounded-full bg-slate-100 p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Maximize2 className="h-5 w-5 rotate-45" />
              </button>
            </div>
            <div className="h-full overflow-y-auto bg-slate-50 p-8 custom-scrollbar">
              <pre className="text-xs text-slate-600 font-mono leading-relaxed">
                {JSON.stringify(workflowJson, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatSection;
