"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Archive,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type ConversationStatus = "open" | "closed";
type StatusFilter = "all" | ConversationStatus;
type SenderRole = "customer" | "admin";

interface ConversationSummary {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerStatus: "active" | "suspended" | null;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  lastMessage: string | null;
  lastSenderRole: SenderRole | null;
  unreadCount: number;
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

interface InboxStatistics {
  total: number;
  open: number;
  closed: number;
  unread: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
}

interface InboxResponse extends ApiErrorResponse {
  data?: ConversationSummary[];
  pagination?: Pagination;
  statistics?: InboxStatistics;
}

interface ThreadResponse extends ApiErrorResponse {
  data?: {
    conversation: Omit<ConversationSummary, "lastMessage" | "lastSenderRole" | "unreadCount">;
    messages: SupportMessage[];
    historyLimit: number;
  };
}

interface ReplyResponse extends ApiErrorResponse {
  data?: {
    conversationId: string;
    status: ConversationStatus;
    message: SupportMessage;
  };
}

interface StatusResponse extends ApiErrorResponse {
  data?: { id: string; status: ConversationStatus };
}

const PAGE_SIZE = 20;
const EMPTY_STATS: InboxStatistics = { total: 0, open: 0, closed: 0, unread: 0 };
const EMPTY_PAGINATION: Pagination = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 0,
  hasPreviousPage: false,
  hasNextPage: false,
};

const inputClassName =
  "min-h-11 w-full rounded-full border border-[#E8DED4] bg-white px-4 py-2.5 text-sm text-[#3B2418] outline-none transition placeholder:text-[#A08D7E] focus:border-[#8A6B55] focus:ring-2 focus:ring-[#8A6B55]/10";
const secondaryButtonClassName =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#E8DED4] bg-white px-4 py-2 text-sm font-medium text-[#665044] transition-colors hover:border-[#BDAA99] hover:bg-[#F3EAE1] disabled:cursor-not-allowed disabled:opacity-50";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
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

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "C";
}

function StatusBadge({ status }: { status: ConversationStatus }) {
  const isOpen = status === "open";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
        isOpen
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-stone-200 bg-stone-100 text-stone-600"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? "bg-emerald-600" : "bg-stone-400"}`} />
      {isOpen ? "Open" : "Closed"}
    </span>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  detail,
}: {
  label: string;
  value: number;
  icon: typeof Inbox;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-[#E8DED4] bg-white p-4 shadow-[0_8px_28px_rgba(59,36,24,0.035)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A8577]">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[#3B2418]">{value}</p>
          <p className="mt-1 text-xs text-[#9A8577]">{detail}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3EAE1] text-[#795A46]">
          <Icon size={19} strokeWidth={1.7} />
        </span>
      </div>
    </article>
  );
}

export function SupportInbox() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [statistics, setStatistics] = useState<InboxStatistics>(EMPTY_STATS);
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadResponse["data"] | null>(null);
  const [reply, setReply] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAuthorizationFailure = useCallback(
    (status: 401 | 403) => {
      router.replace(status === 401 ? "/admin/login" : "/admin/unauthorized");
      router.refresh();
    },
    [router],
  );

  const getAccessToken = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error || !session?.access_token) {
      handleAuthorizationFailure(401);
      return null;
    }
    return session.access_token;
  }, [handleAuthorizationFailure]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const loadInbox = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const token = await getAccessToken();
        if (!token || signal?.aborted) return;
        setIsLoading(true);
        setErrorMessage(null);
        const query = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
          status: statusFilter,
          search,
        });
        const response = await fetch(`/api/admin/support/conversations?${query}`, {
          method: "GET",
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal,
        });
        const result = (await response.json()) as InboxResponse;
        if (response.status === 401 || response.status === 403) {
          handleAuthorizationFailure(response.status);
          return;
        }
        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.message || "Unable to load support conversations.");
        }
        setConversations(result.data);
        setStatistics(result.statistics ?? EMPTY_STATS);
        setPagination(result.pagination ?? EMPTY_PAGINATION);
        setSelectedId((current) => {
          if (current && result.data?.some((item) => item.id === current)) return current;
          return result.data?.[0]?.id ?? null;
        });
      } catch (error) {
        if (signal?.aborted) return;
        setErrorMessage(error instanceof Error ? error.message : "Unable to load support conversations.");
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [getAccessToken, handleAuthorizationFailure, page, search, statusFilter],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      if (!controller.signal.aborted) {
        void loadInbox(controller.signal);
      }
    }, 0);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [loadInbox, refreshVersion]);

  const loadThread = useCallback(
    async (conversationId: string, signal?: AbortSignal) => {
      try {
        const token = await getAccessToken();
        if (!token || signal?.aborted) return;
        setIsThreadLoading(true);
        setErrorMessage(null);
        const response = await fetch(
          `/api/admin/support/conversations/${encodeURIComponent(conversationId)}`,
          {
            method: "GET",
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
            cache: "no-store",
            signal,
          },
        );
        const result = (await response.json()) as ThreadResponse;
        if (response.status === 401 || response.status === 403) {
          handleAuthorizationFailure(response.status);
          return;
        }
        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.message || "Unable to load this conversation.");
        }
        setThread(result.data);
        setRefreshVersion((value) => value + 1);
      } catch (error) {
        if (signal?.aborted) return;
        setThread(null);
        setErrorMessage(error instanceof Error ? error.message : "Unable to load this conversation.");
      } finally {
        if (!signal?.aborted) setIsThreadLoading(false);
      }
    },
    [getAccessToken, handleAuthorizationFailure],
  );

  useEffect(() => {
    if (!selectedId) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      if (!controller.signal.aborted) {
        void loadThread(selectedId, controller.signal);
      }
    }, 0);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [loadThread, selectedId]);

  // Avoid rendering the previous customer's thread while the new one loads.
  const visibleThread =
    selectedId && thread?.conversation.id === selectedId ? thread : null;

  async function handleSendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = reply.trim();
    if (!selectedId || !message || isSending) return;
    setIsSending(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const response = await fetch(
        `/api/admin/support/conversations/${encodeURIComponent(selectedId)}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message }),
        },
      );
      const result = (await response.json()) as ReplyResponse;
      if (response.status === 401 || response.status === 403) {
        handleAuthorizationFailure(response.status);
        return;
      }
      if (!response.ok || !result.success || !result.data?.message) {
        throw new Error(result.message || "Unable to send your reply.");
      }
      setThread((current) =>
        current
          ? {
              ...current,
              conversation: { ...current.conversation, status: "open" },
              messages: [...current.messages, result.data!.message],
            }
          : current,
      );
      setReply("");
      setSuccessMessage("Your reply has been sent.");
      setRefreshVersion((value) => value + 1);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to send your reply.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleStatusChange() {
    if (!selectedId || !visibleThread || isUpdatingStatus) return;
    const nextStatus: ConversationStatus =
      visibleThread.conversation.status === "open" ? "closed" : "open";
    setIsUpdatingStatus(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const response = await fetch(
        `/api/admin/support/conversations/${encodeURIComponent(selectedId)}`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      const result = (await response.json()) as StatusResponse;
      if (response.status === 401 || response.status === 403) {
        handleAuthorizationFailure(response.status);
        return;
      }
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || "Unable to update conversation status.");
      }
      setThread((current) =>
        current
          ? { ...current, conversation: { ...current.conversation, status: result.data!.status } }
          : current,
      );
      setSuccessMessage(result.data.status === "closed" ? "Conversation closed." : "Conversation reopened.");
      setRefreshVersion((value) => value + 1);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update conversation status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A6B55]">
            <span>BARISTABAR</span><span className="h-1 w-1 rounded-full bg-[#BDAA99]" /><span>ADMINISTRATION</span>
          </div>
          <h1 className="text-4xl font-medium tracking-tight text-[#3B2418] sm:text-5xl" style={{ fontFamily: "var(--font-brand)" }}>
            Customer messages
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#795A46]">
            Manage private conversations and help customers with their orders and accounts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            setErrorMessage(null);
            setRefreshVersion((value) => value + 1);
          }}
          className={secondaryButtonClassName}
        >
          <RefreshCw size={15} /> Refresh inbox
        </button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="All conversations" value={statistics.total} detail="Customer support threads" icon={Inbox} />
        <MetricCard label="Open" value={statistics.open} detail="Awaiting or in progress" icon={MessageCircle} />
        <MetricCard label="Unread messages" value={statistics.unread} detail="Messages from customers" icon={AlertCircle} />
        <MetricCard label="Closed" value={statistics.closed} detail="Resolved conversations" icon={Archive} />
      </section>

      {(errorMessage || successMessage) && (
        <div
          role={errorMessage ? "alert" : "status"}
          className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
            errorMessage
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {errorMessage ? <AlertCircle size={17} className="mt-0.5 shrink-0" /> : <Check size={17} className="mt-0.5 shrink-0" />}
          <span>{errorMessage || successMessage}</span>
          <button type="button" className="ml-auto" onClick={() => { setErrorMessage(null); setSuccessMessage(null); }} aria-label="Dismiss message">
            <X size={16} />
          </button>
        </div>
      )}

      <section className="grid min-h-[660px] gap-5 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-2xl border border-[#E8DED4] bg-white shadow-[0_8px_28px_rgba(59,36,24,0.035)]">
          <div className="border-b border-[#F0E7DE] p-4 sm:p-5">
            <div className="relative">
              <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A08D7E]" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search customer or message..."
                className={`${inputClassName} pl-11`}
                maxLength={120}
                aria-label="Search conversations"
              />
            </div>
            <div className="mt-3 grid grid-cols-3 rounded-full bg-[#F8F5F0] p-1">
              {(["open", "closed", "all"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => { setStatusFilter(status); setPage(1); }}
                  className={`rounded-full px-2 py-2 text-xs font-semibold capitalize transition-colors ${
                    statusFilter === status ? "bg-[#3B2418] text-[#F8F2EB] shadow-sm" : "text-[#795A46] hover:bg-white"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-3 text-xs text-[#9A8577] sm:px-5">
            <span>{pagination.total} conversation{pagination.total === 1 ? "" : "s"}</span>
            {isLoading && <LoaderCircle size={15} className="animate-spin" />}
          </div>

          <div className="max-h-[510px] overflow-y-auto">
            {!isLoading && conversations.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F3EAE1] text-[#795A46]"><Inbox size={22} /></span>
                <p className="mt-4 text-sm font-semibold text-[#3B2418]">No conversations found</p>
                <p className="mt-1 text-xs leading-5 text-[#9A8577]">New customer messages will appear here.</p>
              </div>
            ) : (
              conversations.map((conversation) => {
                const active = conversation.id === selectedId;
                return (
                  <button
                    type="button"
                    key={conversation.id}
                    onClick={() => {
                      setIsThreadLoading(true);
                      setSelectedId(conversation.id);
                      setSuccessMessage(null);
                      setErrorMessage(null);
                    }}
                    className={`w-full border-b border-[#F3ECE5] px-4 py-4 text-left transition-colors sm:px-5 ${active ? "bg-[#F8F5F0]" : "hover:bg-[#FBF8F4]"}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8DED4] text-xs font-semibold text-[#684733]">{initials(conversation.customerName)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-[#3B2418]">{conversation.customerName}</span>
                          <span className="shrink-0 text-[10px] text-[#A08D7E]">{formatDate(conversation.lastMessageAt)}</span>
                        </span>
                        <span className="mt-1 block truncate text-xs text-[#8A7567]">{conversation.lastMessage || "No messages yet"}</span>
                        <span className="mt-2 flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className={`h-1.5 w-1.5 rounded-full ${conversation.status === "open" ? "bg-emerald-600" : "bg-stone-400"}`} />
                            <span className="text-[10px] capitalize text-[#9A8577]">{conversation.status}</span>
                            {conversation.customerStatus === "suspended" && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-semibold text-red-700">Suspended account</span>}
                          </span>
                          {conversation.unreadCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#3B2418] px-1.5 text-[10px] font-bold text-white">{conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}</span>}
                        </span>
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[#F0E7DE] px-4 py-3 sm:px-5">
            <span className="text-xs text-[#9A8577]">Page {pagination.page} of {Math.max(1, pagination.totalPages)}</span>
            <div className="flex gap-2">
              <button type="button" disabled={!pagination.hasPreviousPage || isLoading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E8DED4] text-[#795A46] disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={16} /></button>
              <button type="button" disabled={!pagination.hasNextPage || isLoading} onClick={() => setPage((value) => value + 1)} className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E8DED4] text-[#795A46] disabled:opacity-40" aria-label="Next page"><ChevronRight size={16} /></button>
            </div>
          </div>
        </aside>

        <section className="flex min-h-[660px] flex-col overflow-hidden rounded-2xl border border-[#E8DED4] bg-white shadow-[0_8px_28px_rgba(59,36,24,0.035)]">
          {!selectedId || !visibleThread ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
              {isThreadLoading ? <LoaderCircle size={28} className="animate-spin text-[#8A6B55]" /> : <MessageCircle size={34} strokeWidth={1.4} className="text-[#BDAA99]" />}
              <h2 className="mt-4 text-xl font-medium text-[#3B2418]" style={{ fontFamily: "var(--font-brand)" }}>{isThreadLoading ? "Loading conversation" : "Select a conversation"}</h2>
              <p className="mt-1 max-w-sm text-sm leading-6 text-[#9A8577]">Choose a customer conversation from the inbox to read and reply.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b border-[#F0E7DE] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8DED4] text-sm font-semibold text-[#684733]">{initials(visibleThread.conversation.customerName)}</span>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-[#3B2418]">{visibleThread.conversation.customerName}</h2>
                    <p className="truncate text-xs text-[#9A8577]">{visibleThread.conversation.customerEmail || visibleThread.conversation.customerPhone || "Customer support"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {visibleThread.conversation.customerStatus === "suspended" && <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">Customer suspended</span>}
                  <StatusBadge status={visibleThread.conversation.status} />
                  <button type="button" disabled={isUpdatingStatus} onClick={() => void handleStatusChange()} className={secondaryButtonClassName}>
                    {isUpdatingStatus ? <LoaderCircle size={15} className="animate-spin" /> : visibleThread.conversation.status === "open" ? <Archive size={15} /> : <Check size={15} />}
                    {visibleThread.conversation.status === "open" ? "Close" : "Reopen"}
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-[#FBF8F4] px-4 py-5 sm:px-6" aria-live="polite">
                {visibleThread.messages.length === 0 ? (
                  <p className="py-12 text-center text-sm text-[#9A8577]">No messages in this conversation yet.</p>
                ) : (
                  visibleThread.messages.map((message) => {
                    const fromAdmin = message.senderRole === "admin";
                    return (
                      <div key={message.id} className={`flex ${fromAdmin ? "justify-end" : "justify-start"}`}>
                        <article className={`max-w-[min(88%,620px)] rounded-2xl px-4 py-3 shadow-sm ${fromAdmin ? "rounded-br-md bg-[#3B2418] text-[#F8F2EB]" : "rounded-bl-md border border-[#E8DED4] bg-white text-[#3B2418]"}`}>
                          <div className={`mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider ${fromAdmin ? "text-[#D6BDA7]" : "text-[#9A8577]"}`}>
                            {fromAdmin ? <ShieldCheck size={12} /> : <UserRound size={12} />}
                            {fromAdmin ? "BaristaBar support" : visibleThread.conversation.customerName}
                            <span className="font-normal normal-case tracking-normal opacity-80">· {formatDate(message.createdAt)}</span>
                          </div>
                          <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.message}</p>
                          {message.orderId && <p className={`mt-2 border-t pt-2 text-[10px] ${fromAdmin ? "border-white/15 text-[#D6BDA7]" : "border-[#F0E7DE] text-[#9A8577]"}`}>Related order: {message.orderId}</p>}
                          {fromAdmin && <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#D6BDA7]">{message.readAt ? <><CheckCheck size={12} /> Read</> : <><Check size={12} /> Sent</>}</p>}
                        </article>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleSendReply} className="border-t border-[#F0E7DE] bg-white p-4 sm:p-5">
                <label htmlFor="support-admin-reply" className="mb-2 block text-xs font-semibold text-[#795A46]">Your reply</label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <textarea
                    id="support-admin-reply"
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    maxLength={4000}
                    rows={3}
                    placeholder="Write a helpful response..."
                    className="min-h-24 flex-1 resize-y rounded-2xl border border-[#E8DED4] bg-[#FBF8F4] px-4 py-3 text-sm text-[#3B2418] outline-none transition placeholder:text-[#A08D7E] focus:border-[#8A6B55] focus:ring-2 focus:ring-[#8A6B55]/10"
                  />
                  <button type="submit" disabled={!reply.trim() || isSending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#3B2418] px-5 py-3 text-sm font-semibold text-[#F8F2EB] transition-colors hover:bg-[#684733] disabled:cursor-not-allowed disabled:opacity-50">
                    {isSending ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
                    Send reply
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-[#A08D7E]">
                  <span>Messages are private between this customer and BaristaBar.</span>
                  <span>{reply.length}/4000</span>
                </div>
              </form>
            </>
          )}
        </section>
      </section>
    </div>
  );
}
