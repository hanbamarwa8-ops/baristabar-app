"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Check,
  CheckCheck,
  Clock3,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";

type ConversationStatus = "open" | "closed";
type SenderRole = "customer" | "admin";

interface SupportConversation {
  id: string;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
}

interface SupportMessage {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderRole: SenderRole;
  message: string;
  orderId: string | null;
  readAt: string | null;
  createdAt: string;
}

interface ConversationResponse {
  success?: boolean;
  message?: string;
  data?: {
    conversation: SupportConversation | null;
    messages: SupportMessage[];
    historyLimit: number;
  };
}

interface SendMessageResponse {
  success?: boolean;
  message?: string;
  data?: {
    conversationId: string;
    status: ConversationStatus;
    message: SupportMessage;
  };
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function SupportChat() {
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [accessState, setAccessState] = useState<"checking" | "customer" | "login" | "forbidden">("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversation = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/support/conversation", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        signal,
      });
      const result = (await response.json()) as ConversationResponse;
      if (response.status === 401) {
        setAccessState("login");
        return;
      }
      if (response.status === 403) {
        setAccessState("forbidden");
        return;
      }
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || "Unable to load your support conversation.");
      }
      setAccessState("customer");
      setConversation(result.data.conversation);
      setMessages(result.data.messages);
    } catch (error) {
      if (signal?.aborted) return;
      setErrorMessage(error instanceof Error ? error.message : "Unable to load your support conversation.");
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      if (!controller.signal.aborted) {
        void loadConversation(controller.signal);
      }
    }, 0);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [loadConversation]);

  function handleRefresh() {
    setIsLoading(true);
    setErrorMessage(null);
    void loadConversation();
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || isSending) return;

    setIsSending(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await fetch("/api/support/conversation", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ message }),
      });
      const result = (await response.json()) as SendMessageResponse;
      if (response.status === 401) {
        setAccessState("login");
        return;
      }
      if (response.status === 403) {
        setAccessState("forbidden");
        return;
      }
      if (!response.ok || !result.success || !result.data?.message) {
        throw new Error(result.message || "Unable to send your message.");
      }
      setConversation((current) => ({
        id: result.data!.conversationId,
        status: result.data!.status,
        createdAt: current?.createdAt ?? result.data!.message.createdAt,
        updatedAt: result.data!.message.createdAt,
        lastMessageAt: result.data!.message.createdAt,
      }));
      setMessages((current) => [...current, result.data!.message]);
      setDraft("");
      setSuccessMessage("Your message has been sent to BaristaBar support.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to send your message.");
    } finally {
      setIsSending(false);
    }
  }

  if (accessState === "checking" && isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-[#E8DED4] bg-white">
        <div className="flex items-center gap-3 text-sm text-[#795A46]"><LoaderCircle size={20} className="animate-spin" /> Loading your conversation...</div>
      </div>
    );
  }

  if (accessState === "login") {
    return (
      <section className="rounded-2xl border border-[#E8DED4] bg-white px-6 py-14 text-center shadow-[0_8px_28px_rgba(59,36,24,0.035)]">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F3EAE1] text-[#795A46]"><MessageCircle size={25} /></span>
        <h2 className="mt-5 text-2xl font-medium text-[#3B2418]" style={{ fontFamily: "var(--font-brand)" }}>Sign in to contact support</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#9A8577]">Your support messages are private and attached to your BaristaBar customer account.</p>
        <Link href="/sign-in" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-[#3B2418] px-6 py-3 text-sm font-semibold text-[#F8F2EB] transition-colors hover:bg-[#684733]">Sign in</Link>
      </section>
    );
  }

  if (accessState === "forbidden") {
    return (
      <section className="rounded-2xl border border-[#E8DED4] bg-white px-6 py-14 text-center shadow-[0_8px_28px_rgba(59,36,24,0.035)]">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F3EAE1] text-[#795A46]"><ShieldCheck size={25} /></span>
        <h2 className="mt-5 text-2xl font-medium text-[#3B2418]" style={{ fontFamily: "var(--font-brand)" }}>Customer support inbox</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#9A8577]">This support space is available to customer accounts. Please use the appropriate account to continue.</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#E8DED4] bg-white shadow-[0_8px_28px_rgba(59,36,24,0.045)]">
      <div className="flex flex-col gap-3 border-b border-[#F0E7DE] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3EAE1] text-[#795A46]"><MessageCircle size={19} /></span>
          <div>
            <h2 className="text-sm font-semibold text-[#3B2418]">Your conversation with BaristaBar</h2>
            <p className="mt-0.5 text-xs text-[#9A8577]">Private customer support</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {conversation && (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${conversation.status === "open" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-stone-200 bg-stone-100 text-stone-600"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${conversation.status === "open" ? "bg-emerald-600" : "bg-stone-400"}`} />
              {conversation.status === "open" ? "Open" : "Closed"}
            </span>
          )}
          <button type="button" onClick={handleRefresh} disabled={isLoading} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#E8DED4] px-3 py-2 text-xs font-semibold text-[#795A46] transition-colors hover:bg-[#F8F5F0] disabled:opacity-50">
            {isLoading ? <LoaderCircle size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
          </button>
        </div>
      </div>

      {errorMessage && <div role="alert" className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-800"><AlertCircle size={16} />{errorMessage}</div>}
      {successMessage && <div role="status" className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50 px-5 py-3 text-sm text-emerald-800"><Check size={16} />{successMessage}</div>}

      <div className="min-h-[390px] space-y-4 bg-[#FBF8F4] px-4 py-5 sm:min-h-[460px] sm:px-6 sm:py-7" aria-live="polite">
        {!conversation && messages.length === 0 ? (
          <div className="flex min-h-[330px] flex-col items-center justify-center px-4 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8DED4] text-[#795A46]"><MessageCircle size={24} /></span>
            <h3 className="mt-4 text-xl font-medium text-[#3B2418]" style={{ fontFamily: "var(--font-brand)" }}>Start a conversation</h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-[#9A8577]">Send us a message about an order, delivery, product, or your account. Our team will reply here.</p>
          </div>
        ) : (
          messages.map((message) => {
            const fromCustomer = message.senderRole === "customer";
            return (
              <div key={message.id} className={`flex ${fromCustomer ? "justify-end" : "justify-start"}`}>
                <article className={`max-w-[min(88%,640px)] rounded-2xl px-4 py-3 shadow-sm ${fromCustomer ? "rounded-br-md bg-[#3B2418] text-[#F8F2EB]" : "rounded-bl-md border border-[#E8DED4] bg-white text-[#3B2418]"}`}>
                  <div className={`mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider ${fromCustomer ? "text-[#D6BDA7]" : "text-[#9A8577]"}`}>
                    {fromCustomer ? <UserRound size={12} /> : <ShieldCheck size={12} />}
                    {fromCustomer ? "You" : "BaristaBar support"}
                    <span className="font-normal normal-case tracking-normal opacity-80">· {formatDate(message.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.message}</p>
                  {message.orderId && <p className={`mt-2 border-t pt-2 text-[10px] ${fromCustomer ? "border-white/15 text-[#D6BDA7]" : "border-[#F0E7DE] text-[#9A8577]"}`}>Related order: {message.orderId}</p>}
                  {!fromCustomer && <p className="mt-1 flex items-center gap-1 text-[10px] text-[#A08D7E]">{message.readAt ? <><CheckCheck size={12} /> Read</> : <><Clock3 size={12} /> Sent</>}</p>}
                </article>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSendMessage} className="border-t border-[#F0E7DE] bg-white p-4 sm:p-6">
        <label htmlFor="support-customer-message" className="mb-2 block text-xs font-semibold text-[#795A46]">Your message</label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <textarea
            id="support-customer-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={4000}
            rows={3}
            placeholder="Write your message to BaristaBar..."
            className="min-h-24 flex-1 resize-y rounded-2xl border border-[#E8DED4] bg-[#FBF8F4] px-4 py-3 text-sm text-[#3B2418] outline-none transition placeholder:text-[#A08D7E] focus:border-[#8A6B55] focus:ring-2 focus:ring-[#8A6B55]/10"
          />
          <button type="submit" disabled={!draft.trim() || isSending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#3B2418] px-5 py-3 text-sm font-semibold text-[#F8F2EB] transition-colors hover:bg-[#684733] disabled:cursor-not-allowed disabled:opacity-50">
            {isSending ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />} Send message
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-[#A08D7E]">
          <span>Maximum 4,000 characters. Please do not include passwords or payment card details.</span>
          <span className="shrink-0">{draft.length}/4000</span>
        </div>
      </form>
    </section>
  );
}
