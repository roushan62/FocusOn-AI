"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import type { AIConversation } from "@/lib/types";

interface BOQDraftItem {
  category: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  labour_rate?: number;
  remarks?: string;
}

interface StructuredOutput {
  type?: "boq" | "quotation" | string;
  title?: string;
  notes?: string;
  items?: BOQDraftItem[];
  [key: string]: unknown;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  structured?: StructuredOutput | null;
}

const SYSTEM_PROMPT = `You are FocusOn AI, a practical Construction Copilot for an Indian commercial interior fit-out company.
Help with BOQs, quotations, material rates, vendor emails, site/DPR planning, procurement, inventory, payment follow-ups and project profitability.
Use INR and Indian construction terminology. State assumptions clearly and ask for missing area, specification or location instead of inventing certainty.
When generating a BOQ or quotation, include a valid JSON object inside a \`\`\`json code block. BOQ JSON format:
{"type":"boq","title":"...","items":[{"category":"Ceiling|Flooring|Electrical|Plumbing|Painting|Modular Furniture|Civil Work|HVAC|Glass Work|Fire Fighting|Data Cabling|Toilets|Other","description":"...","unit":"sqft|sqm|nos|rft|lump|kg|litre","quantity":number,"rate":number,"labour_rate":number,"remarks":"..."}],"notes":"..."}
Rate is the material/base rate per unit; labour_rate is additional labour per unit. Never omit quantity or rate. For quotations include subtotal, discount_percent, profit_margin_percent, gst_percent and grand_total when enough information is available.`;

const SUGGESTIONS = [
  "Generate BOQ for a 5,000 sqft corporate office with gypsum ceiling and 40 workstations",
  "Prepare a quotation structure for a 3,000 sqft retail showroom in Bangalore",
  "Draft a payment reminder email for an overdue client invoice",
  "Make a next-day site plan for ceiling, electrical and flooring teams",
];

function parseStructuredResponse(response: string): StructuredOutput | null {
  const fenced = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidates = [fenced?.[1], response.slice(response.indexOf("{"), response.lastIndexOf("}") + 1)];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed: unknown = JSON.parse(candidate.trim());
      if (!parsed || typeof parsed !== "object") continue;
      const value = parsed as Record<string, unknown>;
      if (!Array.isArray(value.items)) return value as StructuredOutput;

      const items = value.items
        .map((item): BOQDraftItem | null => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          const quantity = Number(row.quantity);
          const rate = Number(row.rate ?? row.material_rate);
          if (!row.description || !Number.isFinite(quantity) || !Number.isFinite(rate)) return null;
          const labour = Number(row.labour_rate);
          return {
            category: String(row.category || "Other"),
            description: String(row.description),
            unit: String(row.unit || "nos"),
            quantity,
            rate,
            ...(Number.isFinite(labour) ? { labour_rate: labour } : {}),
            ...(row.remarks || row.notes ? { remarks: String(row.remarks || row.notes) } : {}),
          };
        })
        .filter((item): item is BOQDraftItem => Boolean(item));

      return { ...value, items } as StructuredOutput;
    } catch {
      // A normal prose answer is expected for non-BOQ questions.
    }
  }

  return null;
}

function getStreamEventData(event: string): { delta?: string; error?: string; done?: boolean } | null {
  const line = event
    .split("\n")
    .find((part) => part.trimStart().startsWith("data:"));
  if (!line) return null;
  const value = line.replace(/^\s*data:\s*/, "").trim();
  if (value === "[DONE]") return { done: true };
  try {
    return JSON.parse(value) as { delta?: string; error?: string };
  } catch {
    return null;
  }
}

export default function AIChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<AIConversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    let active = true;
    async function fetchHistory() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      const { data } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("company_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (active) setHistory(data || []);
    }
    fetchHistory();
    return () => { active = false; };
  }, []);

  const updateLastAssistant = (content: string, structured?: StructuredOutput | null) => {
    setMessages((previous) => {
      const next = [...previous];
      const last = next.length - 1;
      if (last >= 0 && next[last].role === "assistant") {
        next[last] = { ...next[last], content, ...(structured !== undefined ? { structured } : {}) };
      }
      return next;
    });
  };

  const handleStop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  const handleSend = async () => {
    const userMsg = input.trim();
    if (!userMsg || loading) return;

    const contextMessages = messages.slice(-8).map((message) => ({
      role: message.role,
      content: message.content,
    }));
    setInput("");
    setMessages((previous) => [
      ...previous,
      { role: "user", content: userMsg },
      { role: "assistant", content: "" },
    ]);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let fullResponse = "";

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        signal: controller.signal,
        body: JSON.stringify({
          stream: true,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...contextMessages,
            { role: "user", content: userMsg },
          ],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(errorBody?.error || "AI service unavailable");
      }

      if (!response.body) {
        const data = await response.json() as { response?: string; error?: string };
        if (data.error) throw new Error(data.error);
        fullResponse = data.response || "I could not generate a response. Please try again.";
        updateLastAssistant(fullResponse);
      } else {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finished = false;

        while (!finished) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let boundary = buffer.indexOf("\n\n");
          while (boundary !== -1) {
            const event = buffer.slice(0, boundary).replace(/\r/g, "");
            buffer = buffer.slice(boundary + 2);
            const data = getStreamEventData(event);
            if (data?.error) throw new Error(data.error);
            if (data?.done) {
              finished = true;
              break;
            }
            if (data?.delta) {
              fullResponse += data.delta;
              updateLastAssistant(fullResponse);
            }
            boundary = buffer.indexOf("\n\n");
          }
        }
      }

      if (!fullResponse) fullResponse = "I could not generate a response. Please try again.";
      const structured = parseStructuredResponse(fullResponse);
      updateLastAssistant(fullResponse, structured);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: saved } = await supabase.from("ai_conversations").insert({
          company_id: user.id,
          user_id: user.id,
          agent: "general",
          user_message: userMsg,
          ai_response: fullResponse,
          structured_output: structured || null,
        }).select("*").single();
        if (saved) setHistory((previous) => [saved as AIConversation, ...previous].slice(0, 50));
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        const message = error instanceof Error ? error.message : "Please try again.";
        updateLastAssistant(`I couldn't complete that request. ${message}`);
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleCreateBOQ = (structured: StructuredOutput) => {
    if (!structured.items?.length) return;
    sessionStorage.setItem("focuson_ai_boq_prefill", JSON.stringify({
      title: structured.title || "AI-generated Interior Fit-Out BOQ",
      notes: structured.notes || "Generated with FocusOn AI. Verify quantities, specifications and site measurements before issue.",
      items: structured.items,
    }));
    router.push("/boq?new=1");
  };

  return (
    <div className="flex min-h-[calc(100vh-8.5rem)] flex-col gap-4 xl:flex-row">
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-700">✦</span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">AI Construction Copilot</h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">Fast BOQs, quotations, site planning and vendor communication for fit-out teams.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowHistory((visible) => !visible)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 xl:hidden"
          >
            {showHistory ? "Hide history" : "History"}
          </button>
        </div>

        <Card className="flex min-h-[560px] flex-1 flex-col overflow-hidden border-slate-200 shadow-[0_20px_55px_-35px_rgba(15,23,42,0.45)]">
          <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Copilot online
            </div>
            <span className="text-xs text-slate-400">Streaming responses enabled</span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-4 sm:p-6">
            {messages.length === 0 && (
              <div className="mx-auto max-w-2xl py-8 text-center sm:py-16">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-3xl text-white shadow-lg shadow-slate-900/15">✦</div>
                <h2 className="text-lg font-semibold text-slate-950">What are you working on today?</h2>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Describe a commercial interior project in plain language. I will turn it into a practical next step with assumptions you can review.</p>
                <div className="mt-6 grid gap-2 text-left sm:grid-cols-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setInput(suggestion)}
                      className="rounded-xl border border-slate-200 bg-white p-3 text-left text-xs leading-5 text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
                {message.role === "assistant" && (
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm text-white">✦</div>
                )}
                <div className={`max-w-[92%] rounded-2xl px-4 py-3 sm:max-w-[78%] ${message.role === "user" ? "rounded-br-md bg-slate-950 text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-800 shadow-sm"}`}>
                  {message.role === "assistant" && !message.content ? (
                    <div className="flex items-center gap-2 text-sm text-slate-400"><Loading size="sm" message="" /><span>Thinking…</span></div>
                  ) : (
                    <div className="whitespace-pre-wrap text-sm leading-6">{message.content}</div>
                  )}
                  {message.structured?.items?.length ? (
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                      <span className="text-xs text-slate-500">{message.structured.items.length} BOQ line items detected</span>
                      <button
                        type="button"
                        onClick={() => handleCreateBOQ(message.structured as StructuredOutput)}
                        className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                      >
                        Create BOQ
                      </button>
                    </div>
                  ) : null}
                </div>
                {message.role === "user" && (
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm text-sky-800">You</div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-slate-100 bg-white p-3 sm:p-4">
            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about a BOQ, quotation, site report or vendor…"
                aria-label="Message the construction copilot"
                className="min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                rows={2}
                maxLength={12000}
              />
              {loading ? (
                <Button type="button" variant="outline" onClick={handleStop} className="mb-0.5 shrink-0">Stop</Button>
              ) : (
                <Button type="button" onClick={() => void handleSend()} disabled={!input.trim()} className="mb-0.5 shrink-0">Send</Button>
              )}
            </div>
            <p className="mt-2 px-2 text-[11px] text-slate-400">Enter to send · Shift + Enter for a new line · Always validate rates against current vendor quotes.</p>
          </div>
        </Card>
      </section>

      <aside className={`${showHistory ? "block" : "hidden"} w-full xl:block xl:w-80`}>
        <Card title="Recent conversations" className="h-full border-slate-200">
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Your saved conversations will appear here.</p>
          ) : (
            <div className="space-y-2">
              {history.map((conversation) => (
                <div key={conversation.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="line-clamp-2 text-xs font-medium leading-5 text-slate-700">{conversation.user_message}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{new Date(conversation.created_at).toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </aside>
    </div>
  );
}
