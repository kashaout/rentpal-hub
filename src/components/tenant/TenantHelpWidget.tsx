import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Phone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatResponse {
  reply: string;
  cantAnswer: boolean;
  landlordPhone: string | null;
  landlordName: string | null;
}

const INITIAL_GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'm your RentPal assistant. Ask me about rent payments, maintenance, WiFi/door codes, or anything about your tenancy.",
};

/**
 * Floating AI help button for active tenants only.
 * Falls back to "Call Landlord" when the AI can't answer.
 */
export function TenantHelpWidget() {
  const { isActiveTenant } = useActiveTenant();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [landlordPhone, setLandlordPhone] = useState<string | null>(null);
  const [landlordName, setLandlordName] = useState<string | null>(null);
  const [showCallFallback, setShowCallFallback] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  if (!isActiveTenant) return null;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    setShowCallFallback(false);

    try {
      const { data, error } = await supabase.functions.invoke<ChatResponse>(
        "tenant-help-chat",
        { body: { messages: next.map(({ role, content }) => ({ role, content })) } }
      );
      if (error) throw error;
      if (!data) throw new Error("Empty response");

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      setLandlordPhone(data.landlordPhone);
      setLandlordName(data.landlordName);
      if (data.cantAnswer) setShowCallFallback(true);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            e?.message?.includes("Rate limit")
              ? "I'm getting too many requests right now. Please try again in a moment."
              : "Something went wrong. You can reach out to your landlord directly.",
        },
      ]);
      setShowCallFallback(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
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
          {/* Header */}
          <div className="flex items-center gap-2 border-b bg-primary/5 px-4 py-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Tenant Help</p>
              <p className="truncate text-[10px] text-muted-foreground">
                AI assistant for your tenancy
              </p>
            </div>
          </div>

          {/* Messages */}
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

              {showCallFallback && landlordPhone && (
                <div className="rounded-xl border border-warning/30 bg-warning/5 p-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Need to speak to {landlordName ?? "your landlord"}?
                  </p>
                  <Button
                    asChild
                    size="sm"
                    className="w-full gap-2"
                  >
                    <a href={`tel:${landlordPhone}`}>
                      <Phone className="h-3.5 w-3.5" />
                      Call Landlord
                    </a>
                  </Button>
                </div>
              )}

              {showCallFallback && !landlordPhone && (
                <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs text-muted-foreground">
                  Your landlord hasn't added a phone number yet. Please use Messages instead.
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
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
              placeholder="Ask anything…"
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
