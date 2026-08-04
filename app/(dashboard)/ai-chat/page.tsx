"use client";

import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loading } from "@/components/ui/Loading";
import type { AIConversation } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  structured?: unknown;
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<AIConversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    async function fetchHistory() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("company_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setHistory(data || []);
    }
    fetchHistory();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Build context from recent conversation
      const contextMessages = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const systemPrompt = `You are the Construction Copilot AI for FocusOn AI, an interior fit-out ERP system. 
You help with:
1. Generating BOQ (Bill of Quantities) from natural language
2. Preparing quotations with proper GST, profit margin, discounts
3. Suggesting materials, rates, and quantities
4. Drafting client/vendor emails
5. Analyzing project costs and profitability
6. Managing site reports and DPR

When the user asks to generate a BOQ or quotation, respond with a structured JSON using \`\`\`json blocks.

For BOQ generation, use this JSON format:
{
  "type": "boq",
  "title": "...",
  "items": [
    {
      "category": "Ceiling|Flooring|Electrical|Plumbing|Painting|Modular Furniture|Civil Work|HVAC|Other",
      "description": "Detailed description of the work/item",
      "unit": "sqft|sqm|nos|rft|lump|kg|litre",
      "quantity": number,
      "rate": number (in INR per unit),
      "labour_rate": number (optional, in INR per unit),
      "remarks": "any notes"
    }
  ],
  "notes": "any additional notes"
}

For quotation, include: subtotal, discount_percent, gst_percent (default 18%), profit_margin_percent (default 15%), grand_total.

Current rates reference (approximate INR):
- Gypsum ceiling: ₹85-120/sqft
- Grid ceiling: ₹65-95/sqft  
- Vitrified tile flooring: ₹75-150/sqft
- Modular furniture: ₹1200-2500/sqft
- Electrical wiring: ₹90-150/sqft
- Painting: ₹18-35/sqft
- Plumbing: ₹120-200/sqft
- Glass partition: ₹350-600/sqft
- HVAC: ₹250-400/sqft

Always be helpful, professional, and specific to Indian construction/interior fit-out context.`;

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            ...contextMessages,
            { role: "user", content: userMsg },
          ],
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${data.error}` },
        ]);
      } else {
        // Try to extract structured data from response
        let structured = null;
        try {
          const jsonMatch = data.response.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            structured = JSON.parse(jsonMatch[1]);
          }
        } catch {}

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response, structured },
        ]);

        // Save to history
        await supabase.from("ai_conversations").insert({
          company_id: user.id,
          user_id: user.id,
          agent: "general",
          user_message: userMsg,
          ai_response: data.response,
          structured_output: structured || undefined,
        });
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    }

    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCreateBOQ = async (item: { category: string; description: string; unit: string; quantity: number; rate: number; labour_rate?: number }, boqId?: string) => {
    // Navigate to BOQ creation with pre-filled data
    alert("BOQ creation from chat will open the BOQ form with pre-filled data. Integrate with the BOQ creation flow.");
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Chat Area */}
      <div className="flex flex-1 flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">AI Construction Copilot</h1>
          <p className="text-sm text-gray-500">Ask me to generate BOQs, quotations, emails, or analyze your projects</p>
        </div>

        <Card className="flex flex-1 flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
                  <span className="text-3xl">🤖</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Construction Copilot</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try: "Generate BOQ for 5000 sqft office with gypsum ceiling and modular furniture"
                </p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {[
                    "Generate BOQ for gypsum ceiling 2000 sqft",
                    "Prepare quotation for Client ABC with 10% discount",
                    "Draft payment reminder email for Project XYZ",
                    "Analyze material wastage for Project ABC",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="rounded-full border px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm">🤖</div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}>
                  <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                  {msg.structured ? (
                    <div className="mt-3 border-t pt-2">
                      <button
                        onClick={() => handleCreateBOQ((msg.structured as Record<string, never>)?.items?.[0])}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        + Add to BOQ
                      </button>
                    </div>
                  ) : null}
                </div>
                {msg.role === "user" && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-sm">👤</div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your request... (e.g., Generate BOQ for 5000 sqft office interior)"
                className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={2}
              />
              <Button
                onClick={handleSend}
                loading={loading}
                disabled={!input.trim()}
                className="self-end"
              >
                Send
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* History Sidebar */}
      <div className={`w-80 ${showHistory ? "block" : "hidden"} lg:block`}>
        <Card title="Recent Conversations" className="h-full">
          {history.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No conversations yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="rounded-lg border p-3 text-xs">
                  <p className="font-medium text-gray-700 truncate">{h.user_message}</p>
                  <p className="text-gray-500 mt-1">{new Date(h.created_at).toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
