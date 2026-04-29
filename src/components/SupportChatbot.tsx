import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Sparkles, Loader2, Phone, Mail, Package, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { CONTACT, telHref, mailHref } from "@/config/contact";

type ChatMsg = { role: "user" | "assistant"; content: string };
type Mode = "general" | "order_status";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;
const PUBLIC_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const STARTER_QUESTIONS = [
  "What are your delivery hours?",
  "How much is delivery?",
  "Do I need to show ID?",
  "What payment methods do you accept?",
];

const WELCOME: ChatMsg = {
  role: "assistant",
  content:
    "👋 Hi! I'm the **Deliverr Assistant**. Ask me anything about ordering, delivery, payments, or your account in Regina. Need help with a specific order? Tap **Check order status** below.",
};

const ORDER_INTRO: ChatMsg = {
  role: "assistant",
  content:
    "📦 **Order Status mode.** Please paste your **order number** (the 8-character code from your confirmation email or the Orders page). I'll look it up and tell you the best next steps.",
};

const SupportChatbot = () => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("general");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderInput, setOrderInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, mode, orderId]);

  const resetToGeneral = () => {
    setMode("general");
    setOrderId(null);
    setOrderInput("");
    setMessages([WELCOME]);
    setError(null);
  };

  const enterOrderMode = () => {
    setMode("order_status");
    setOrderId(null);
    setOrderInput("");
    setError(null);
    setMessages([ORDER_INTRO]);
  };

  const submitOrderId = async (raw: string) => {
    const cleaned = raw.trim().replace(/^#/, "");
    if (!cleaned) return;
    setOrderId(cleaned);
    // Kick off automatically with a default question
    await sendChat(`Look up my order ${cleaned} and tell me what to do next.`, {
      mode: "order_status",
      orderId: cleaned,
      seedMessages: [ORDER_INTRO, { role: "user", content: `Order #${cleaned}` }],
    });
  };

  const sendChat = async (
    text: string,
    opts?: {
      mode?: Mode;
      orderId?: string | null;
      seedMessages?: ChatMsg[];
    },
  ) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);

    const baseMessages = opts?.seedMessages ?? [...messages, { role: "user" as const, content: trimmed }];
    // If we're appending normally, the user message is already in baseMessages; if seeded, we don't double-add.
    const next: ChatMsg[] = opts?.seedMessages ? baseMessages : baseMessages;
    setMessages(next);
    setInput("");
    setLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > next.length) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      // Use the user's session token if available so the edge function can verify ownership
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token ?? PUBLIC_KEY;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: PUBLIC_KEY,
        },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          mode: opts?.mode ?? mode,
          orderId: opts?.orderId ?? orderId,
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) throw new Error("Too many requests. Please try again in a moment.");
        if (resp.status === 402) throw new Error("AI service unavailable right now. Please contact support.");
        throw new Error("Something went wrong. Please try again.");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        buf += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":") || !line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) upsertAssistant(delta);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    sendChat(trimmed, { seedMessages: [...messages, { role: "user", content: trimmed }] });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const handleOrderIdKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitOrderId(orderInput);
    }
  };

  const showOrderIdPrompt = mode === "order_status" && !orderId;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close support chat" : "Open support chat"}
        className={cn(
          "fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95",
          "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground",
        )}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && (
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-background animate-pulse" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className={cn(
            "fixed z-50 bg-card border border-border shadow-2xl flex flex-col overflow-hidden",
            "bottom-0 right-0 left-0 sm:bottom-24 sm:right-5 sm:left-auto",
            "h-[85vh] sm:h-[600px] sm:max-h-[80vh] sm:w-[400px] sm:rounded-2xl",
          )}
          role="dialog"
          aria-label="Deliverr Support Chat"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {mode === "order_status" && (
                <button
                  onClick={resetToGeneral}
                  aria-label="Back to general chat"
                  className="p-1 rounded-md hover:bg-white/20 transition-colors shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                {mode === "order_status" ? <Package className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-base leading-tight truncate">
                  {mode === "order_status" ? "Order Status" : "Deliverr Assistant"}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-primary-foreground/90">
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  {orderId ? `Order #${orderId.slice(0, 8).toUpperCase()}` : "Online · Replies instantly"}
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="p-1 rounded-md hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card border border-border text-foreground rounded-bl-sm",
                  )}
                >
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-strong:text-inherit">
                    <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}

            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            {error && (
              <div className="text-center text-xs text-destructive bg-destructive/10 rounded-lg p-2">
                {error}
              </div>
            )}

            {/* Mode entry CTA + starter questions on welcome */}
            {mode === "general" && messages.length === 1 && !loading && (
              <div className="pt-2 space-y-2">
                <button
                  onClick={enterOrderMode}
                  className="w-full flex items-center gap-2 bg-primary/10 border border-primary/30 hover:bg-primary/15 text-foreground rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
                >
                  <Package className="h-4 w-4 text-primary" />
                  Check order status
                </button>
                <p className="text-xs text-muted-foreground font-medium px-1 pt-1">Quick questions:</p>
                {STARTER_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="block w-full text-left text-sm bg-card border border-border hover:border-primary hover:bg-primary/5 rounded-xl px-3 py-2 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Contact strip */}
          <div className="px-4 py-2 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <a href={telHref} className="flex items-center gap-1.5 hover:text-primary transition-colors">
              <Phone className="h-3 w-3" /> {CONTACT.phoneShort}
            </a>
            <a href={mailHref} className="flex items-center gap-1.5 hover:text-primary transition-colors">
              <Mail className="h-3 w-3" /> Email us
            </a>
          </div>

          {/* Input area: either order-id prompt or chat input */}
          {showOrderIdPrompt ? (
            <div className="border-t border-border bg-card p-3">
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
                Order number
              </label>
              <div className="flex items-center gap-2">
                <input
                  value={orderInput}
                  onChange={(e) => setOrderInput(e.target.value)}
                  onKeyDown={handleOrderIdKeyDown}
                  placeholder="e.g. A1B2C3D4"
                  autoFocus
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono uppercase"
                />
                <button
                  onClick={() => submitOrderId(orderInput)}
                  disabled={!orderInput.trim() || loading}
                  className="h-10 px-4 shrink-0 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Look up"}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Find this in your confirmation email or the <a href="/orders" className="underline">Orders page</a>.
              </p>
            </div>
          ) : (
            <div className="border-t border-border bg-card p-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={mode === "order_status" ? "Ask a follow-up about this order…" : "Type your question…"}
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 max-h-32"
                />
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim() || loading}
                  aria-label="Send message"
                  className="h-10 w-10 shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                AI assistant · For order issues call {CONTACT.phoneShort}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default SupportChatbot;
