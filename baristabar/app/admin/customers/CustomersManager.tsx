"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type CustomerStatus = "active" | "suspended";
type StatusFilter = "all" | CustomerStatus;

interface AdminCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  accountStatus: CustomerStatus;
  createdAt: string;
  orderCount: number;
  totalSpent: string;
  lastOrderAt: string | null;
}

interface CustomersPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

interface CustomersStatistics {
  totalCustomers: number;
  activeCustomers: number;
  suspendedCustomers: number;
  totalPaid: string;
}

interface CustomersResponse {
  success: boolean;
  message?: string;
  data?: AdminCustomer[];
  pagination?: CustomersPagination;
  statistics?: CustomersStatistics;
}

interface StatusUpdateResponse {
  success?: boolean;
  message?: string;
  data?: {
    id: string;
    accountStatus: CustomerStatus;
  };
}

interface PendingAction {
  customer: AdminCustomer;
  nextStatus: CustomerStatus;
}

const PAGE_SIZE = 25;
const EMPTY_PAGINATION: CustomersPagination = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 0,
  hasPreviousPage: false,
  hasNextPage: false,
};
const EMPTY_STATISTICS: CustomersStatistics = {
  totalCustomers: 0,
  activeCustomers: 0,
  suspendedCustomers: 0,
  totalPaid: "0",
};

const inputClassName =
  "min-h-11 w-full rounded-full border border-[#E8DED4] bg-white px-4 py-2.5 text-sm text-[#3B2418] outline-none transition placeholder:text-[#A08D7E] focus:border-[#8A6B55] focus:ring-2 focus:ring-[#8A6B55]/10";

const secondaryButtonClassName =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#E8DED4] bg-white px-4 py-2 text-sm font-medium text-[#665044] transition-colors hover:border-[#BDAA99] hover:bg-[#F3EAE1] disabled:cursor-not-allowed disabled:opacity-50";

function formatMoney(value: number | string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";

  try {
    return new Intl.NumberFormat("fr-TN", {
      style: "currency",
      currency: "TND",
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(amount);
  } catch {
    return `${amount.toFixed(3)} TND`;
  }
}

function formatDate(value: string | null): string {
  if (!value) return "No order yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function customerInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "C";
}

function StatusBadge({ status }: { status: CustomerStatus }) {
  const suspended = status === "suspended";
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
        suspended
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          suspended ? "bg-red-500" : "bg-emerald-600"
        }`}
      />
      {suspended ? "Suspended" : "Active"}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Users;
}) {
  return (
    <article className="rounded-2xl border border-[#E8DED4] bg-white p-5 shadow-[0_8px_28px_rgba(59,36,24,0.035)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9A8577]">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[#3B2418]">
            {value}
          </p>
          <p className="mt-1 text-xs text-[#9A8577]">{detail}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3EAE1] text-[#795A46]">
          <Icon size={19} strokeWidth={1.7} />
        </div>
      </div>
    </article>
  );
}

export function CustomersManager() {
  const router = useRouter();
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [pagination, setPagination] = useState<CustomersPagination>(EMPTY_PAGINATION);
  const [statistics, setStatistics] = useState<CustomersStatistics>(EMPTY_STATISTICS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [processingCustomerId, setProcessingCustomerId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");

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

  const loadCustomers = useCallback(
    async (signal: AbortSignal) => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const accessToken = await getAccessToken();
        if (!accessToken || signal.aborted) return;

        const query = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
          search: search.trim(),
          status: statusFilter,
        });

        const response = await fetch(`/api/admin/customers?${query.toString()}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
          signal,
        });

        if (signal.aborted) return;
        if (response.status === 401 || response.status === 403) {
          handleAuthorizationFailure(response.status);
          return;
        }

        const result = (await response.json().catch(() => null)) as CustomersResponse | null;
        if (
          !response.ok ||
          result?.success !== true ||
          !Array.isArray(result.data) ||
          !result.pagination ||
          !result.statistics
        ) {
          setErrorMessage(result?.message ?? "Unable to load customers. Please try again.");
          return;
        }

        setCustomers(result.data);
        setPagination(result.pagination);
        setStatistics(result.statistics);
        if (result.pagination.page !== page) setPage(result.pagination.page);
      } catch (error) {
        if (signal.aborted) return;
        console.error("Failed to load admin customers:", error);
        setErrorMessage("Unable to contact the server. Please check your connection.");
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    },
    [getAccessToken, handleAuthorizationFailure, page, search, statusFilter],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadCustomers(controller.signal);
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadCustomers, refreshVersion]);

  const changeCustomerStatus = useCallback(async () => {
    if (!pendingAction || processingCustomerId !== null) return;

    setProcessingCustomerId(pendingAction.customer.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const response = await fetch(
        `/api/admin/customers/${encodeURIComponent(pendingAction.customer.id)}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountStatus: pendingAction.nextStatus,
            ...(pendingAction.nextStatus === "suspended"
              ? { reason: suspensionReason.trim() }
              : {}),
          }),
          cache: "no-store",
        },
      );

      if (response.status === 401 || response.status === 403) {
        handleAuthorizationFailure(response.status);
        return;
      }

      const result = (await response.json().catch(() => null)) as StatusUpdateResponse | null;
      if (
        !response.ok ||
        result?.success !== true ||
        result.data?.id !== pendingAction.customer.id ||
        result.data.accountStatus !== pendingAction.nextStatus
      ) {
        setErrorMessage(result?.message ?? "Unable to update this customer account.");
        return;
      }

      setCustomers((current) =>
        current.map((customer) =>
          customer.id === pendingAction.customer.id
            ? { ...customer, accountStatus: pendingAction.nextStatus }
            : customer,
        ),
      );
      setSuccessMessage(
        pendingAction.nextStatus === "suspended"
          ? `${pendingAction.customer.name}'s account has been suspended.`
          : `${pendingAction.customer.name}'s account has been reactivated.`,
      );
      setPendingAction(null);
      setSuspensionReason("");
      setRefreshVersion((current) => current + 1);
    } catch (error) {
      console.error("Failed to update customer status:", error);
      setErrorMessage("Unable to contact the server to update this account.");
    } finally {
      setProcessingCustomerId(null);
    }
  }, [
    getAccessToken,
    handleAuthorizationFailure,
    pendingAction,
    processingCustomerId,
    suspensionReason,
  ]);

  function openStatusDialog(customer: AdminCustomer) {
    setErrorMessage(null);
    setSuspensionReason("");
    setPendingAction({
      customer,
      nextStatus: customer.accountStatus === "active" ? "suspended" : "active",
    });
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 border-b border-[#E8DED4] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9A8577]">
            Customer relationship
          </p>
          <h1
            className="mt-1 text-3xl font-medium tracking-tight text-[#3B2418] sm:text-4xl"
            style={{ fontFamily: "var(--font-brand)" }}
          >
            Customers
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#795A46]">
            View customer profiles, review their purchase activity, and manage account access.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRefreshVersion((current) => current + 1)}
          disabled={isLoading}
          className={secondaryButtonClassName}
        >
          <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Customer statistics">
        <MetricCard
          label="Total customers"
          value={statistics.totalCustomers}
          detail="Customer accounts only"
          icon={Users}
        />
        <MetricCard
          label="Active accounts"
          value={statistics.activeCustomers}
          detail="Currently allowed to check out"
          icon={ShieldCheck}
        />
        <MetricCard
          label="Suspended accounts"
          value={statistics.suspendedCustomers}
          detail="Checkout access disabled"
          icon={ShieldAlert}
        />
        <MetricCard
          label="Paid spending"
          value={formatMoney(statistics.totalPaid)}
          detail="Paid, non-cancelled orders"
          icon={Wallet}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#E8DED4] bg-white shadow-[0_8px_28px_rgba(59,36,24,0.035)]">
        <div className="flex flex-col gap-4 border-b border-[#E8DED4] p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#3B2418]">Customer directory</h2>
            <p className="mt-1 text-xs text-[#9A8577]">
              {pagination.total} {pagination.total === 1 ? "customer" : "customers"} found
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-2xl">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search customers</span>
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A08D7E]"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                maxLength={120}
                placeholder="Search name, email or phone..."
                className={`${inputClassName} pl-10`}
              />
            </label>

            <label className="sm:w-44">
              <span className="sr-only">Filter by account status</span>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as StatusFilter);
                  setPage(1);
                }}
                className={inputClassName}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mx-4 mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:mx-5"
          >
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div
            role="status"
            className="mx-4 mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 sm:mx-5"
          >
            <Check size={17} className="mt-0.5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-232.5 border-collapse text-left">
            <thead className="bg-[#FBF8F4]">
              <tr className="border-b border-[#E8DED4] text-[10px] font-semibold uppercase tracking-[0.13em] text-[#9A8577]">
                <th className="px-5 py-4">Customer</th>
                <th className="px-4 py-4">Contact</th>
                <th className="px-4 py-4">Orders</th>
                <th className="px-4 py-4">Paid spending</th>
                <th className="px-4 py-4">Last order</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E8E1]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-sm text-[#9A8577]">
                    <RefreshCw size={18} className="mx-auto mb-3 animate-spin" />
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#F3EAE1] text-[#795A46]">
                      <Users size={20} />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-[#3B2418]">No customers found</p>
                    <p className="mt-1 text-xs text-[#9A8577]">
                      Try changing the search term or status filter.
                    </p>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="align-middle transition-colors hover:bg-[#FFFCF9]">
                    <td className="px-5 py-4">
                      <div className="flex min-w-47.5 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F3EAE1] text-xs font-bold text-[#795A46]">
                          {customerInitials(customer.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#3B2418]">{customer.name}</p>
                          <p className="mt-0.5 text-[11px] text-[#A08D7E]">
                            Joined {formatDate(customer.createdAt)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1.5 text-xs text-[#795A46]">
                        <p className="flex max-w-55 items-center gap-1.5 truncate">
                          <Mail size={13} className="shrink-0 text-[#A08D7E]" />
                          <span className="truncate">{customer.email || "Email unavailable"}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Phone size={13} className="shrink-0 text-[#A08D7E]" />
                          <span>{customer.phone || "Phone not provided"}</span>
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums text-[#3B2418]">
                        <ShoppingBag size={14} className="text-[#A08D7E]" />
                        {customer.orderCount}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-[#3B2418]">
                        {formatMoney(customer.totalSpent)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-[#795A46]">
                        <Clock3 size={13} className="text-[#A08D7E]" />
                        {formatDate(customer.lastOrderAt)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={customer.accountStatus} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openStatusDialog(customer)}
                        disabled={processingCustomerId !== null}
                        className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          customer.accountStatus === "active"
                            ? "border-red-200 bg-white text-red-700 hover:bg-red-50"
                            : "border-[#BDAA99] bg-[#F3EAE1] text-[#5E402E] hover:bg-[#E8DED4]"
                        }`}
                      >
                        {customer.accountStatus === "active" ? (
                          <><ShieldAlert size={13} /> Suspend</>
                        ) : (
                          <><ShieldCheck size={13} /> Reactivate</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#E8DED4] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-[#9A8577]">
            {pagination.total === 0
              ? "No results"
              : `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(
                  pagination.page * pagination.limit,
                  pagination.total,
                )} of ${pagination.total}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={!pagination.hasPreviousPage || isLoading}
              className={secondaryButtonClassName}
            >
              <ChevronLeft size={15} /> Previous
            </button>
            <span className="min-w-20 text-center text-xs font-medium tabular-nums text-[#795A46]">
              Page {pagination.page} of {Math.max(1, pagination.totalPages)}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={!pagination.hasNextPage || isLoading}
              className={secondaryButtonClassName}
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </section>

      <p className="text-xs leading-5 text-[#A08D7E]">
        Customer accounts are created through the existing account-registration process. Admin accounts are not displayed or managed here.
        Paid spending excludes unpaid, failed, refunded, and cancelled orders.
      </p>

      {pendingAction && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-[#24170F]/45 p-4 backdrop-blur-[3px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && processingCustomerId === null) {
              setPendingAction(null);
              setSuspensionReason("");
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-status-dialog-title"
            className="w-full max-w-lg rounded-2xl border border-[#E8DED4] bg-[#FBF8F4] p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  pendingAction.nextStatus === "suspended"
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}>
                  {pendingAction.nextStatus === "suspended" ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
                </div>
                <div>
                  <h2 id="customer-status-dialog-title" className="text-lg font-semibold text-[#3B2418]">
                    {pendingAction.nextStatus === "suspended" ? "Suspend customer account?" : "Reactivate customer account?"}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[#795A46]">
                    {pendingAction.customer.name} · {pendingAction.customer.email || "No email available"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPendingAction(null);
                  setSuspensionReason("");
                }}
                disabled={processingCustomerId !== null}
                aria-label="Close dialog"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#795A46] transition-colors hover:bg-[#E8DED4] disabled:opacity-50"
              >
                <X size={17} />
              </button>
            </div>

            {pendingAction.nextStatus === "suspended" ? (
              <>
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm leading-6 text-red-900">
                  This customer will no longer be able to place orders while the account is suspended. Existing account data and order history will be preserved.
                </div>
                <label className="mt-4 block">
                  <span className="mb-1.5 block text-xs font-semibold text-[#5E4739]">
                    Reason <span className="font-normal text-[#A08D7E]">(optional)</span>
                  </span>
                  <textarea
                    value={suspensionReason}
                    onChange={(event) => setSuspensionReason(event.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Add an internal note for this suspension..."
                    className="w-full resize-y rounded-xl border border-[#E8DED4] bg-white px-4 py-3 text-sm text-[#3B2418] outline-none transition placeholder:text-[#A08D7E] focus:border-[#8A6B55] focus:ring-2 focus:ring-[#8A6B55]/10"
                  />
                  <span className="mt-1 block text-right text-[10px] text-[#A08D7E]">
                    {suspensionReason.length}/500
                  </span>
                </label>
              </>
            ) : (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm leading-6 text-emerald-900">
                This customer will be able to sign in and place orders again. The previous suspension details will be cleared.
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setPendingAction(null);
                  setSuspensionReason("");
                }}
                disabled={processingCustomerId !== null}
                className={secondaryButtonClassName}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void changeCustomerStatus()}
                disabled={processingCustomerId !== null}
                className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  pendingAction.nextStatus === "suspended"
                    ? "bg-red-700 hover:bg-red-800"
                    : "bg-[#3B2418] hover:bg-[#684733]"
                }`}
              >
                {processingCustomerId !== null ? (
                  <><RefreshCw size={15} className="animate-spin" /> Updating...</>
                ) : pendingAction.nextStatus === "suspended" ? (
                  <><ShieldAlert size={15} /> Confirm suspension</>
                ) : (
                  <><ShieldCheck size={15} /> Reactivate account</>
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
