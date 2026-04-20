import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatResponse {
  reply: string;
  cantAnswer: boolean;
  supportEmail: string;
}

const INITIAL_GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'm RentPal's assistant. Ask me about features, pricing, how to get started, or anything else about RentPal.",
};

const PUBLIC_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-help-chat`;

/**
 * Floating AI Help widget for the public marketing site.
 * No auth required. Falls back to "Contact Support" when it can't answer.
 */
export function PublicHelpWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [supportEmail, setSupportEmail] = useState<string>("support@rentpal.app");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    setShowFallback(false);

    try {
      const resp = await fetch(PUBLIC_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
        }),
      });
      if (resp.status === 429 || resp.status === 402) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I'm getting too many requests right now. Please try again in a moment.",
          },
        ]);
        return;
      }
      if (!resp.ok) throw new Error("Request failed");
      const data: ChatResponse = await resp.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      if (data.supportEmail) setSupportEmail(data.supportEmail);
      if (data.cantAnswer) setShowFallback(true);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Something went wrong. You can reach our team directly using the button below.",
        },
      ]);
      setShowFallback(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-elevated transition-all duration-200",
          "bg-primary text-primary-foreground hover:scale-105"
        )}
        aria-label={open ? "Close help" : "Open help"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <Card
          className={cn(
            "fixed bottom-24 right-6 z-40 flex w-[min(380px,calc(100vw-3rem))] flex-col overflow-hidden border shadow-elevated",
            "h-[min(560px,calc(100vh-8rem))]"
          )}
        >
          <div className="flex items-center gap-2 border-b bg-primary/5 px-4 py-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">RentPal Help</p>
              <p className="truncate text-[10px] text-muted-foreground">
                Ask me anything about RentPal
              </p>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div ref={scrollRef} className="space-y-3 p-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {m.content}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground w-fit">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Thinking…
                </div>
              )}

              {showFallback && (
                <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Need to talk to a human? Reach our support team:
                  </p>
                  <Button asChild size="sm" className="w-full gap-2">
                    <a href={`mailto:${supportEmail}?subject=RentPal%20Support%20Request`}>
                      <Mail className="h-3.5 w-3.5" />
                      Contact Support
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex gap-2 border-t p-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || loading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </Card>
      )}
    </>
  );
}
