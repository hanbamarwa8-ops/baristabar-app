
"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  CreditCard,
  Mail,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Search,
  ShoppingBag,
  Truck,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

type DateFilter = "all" | "today" | "7days" | "30days";

type OrderItem = {
  id: string;
  type: "product" | "beanbox";
  name: string;
  slug: string;
  boxSlug: string | null;
  configurationLabel: string | null;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

type AdminOrder = {
  id: string;
  createdAt: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  shippingGovernorate: string | null;
  shippingCity: string;
  shippingPostalCode: string | null;
  shippingNotes: string | null;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  currency: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  items: OrderItem[];
};

type OrdersResponse = {
  success: boolean;
  data?: AdminOrder[];
  message?: string;
};

type StatusUpdateResponse = {
  success?: boolean;
  message?: string;
  data?: {
    id: string;
    status: OrderStatus;
  };
};

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  confirmed: "border-sky-200 bg-sky-50 text-sky-800",
  processing: "border-purple-200 bg-purple-50 text-purple-800",
  shipped: "border-blue-200 bg-blue-50 text-blue-800",
  delivered: "border-green-200 bg-green-50 text-green-800",
  cancelled: "border-red-200 bg-red-50 text-red-800",
};

const STATUS_DOTS: Record<OrderStatus, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-sky-500",
  processing: "bg-purple-500",
  shipped: "bg-blue-500",
  delivered: "bg-green-600",
  cancelled: "bg-red-500",
};

const fieldClassName =
  "min-h-11 w-full rounded-full border border-[#E8DED4] bg-white px-4 py-2.5 text-sm text-[#3B2418] outline-none transition placeholder:text-[#A08D7E] focus:border-[#8A6B55] focus:ring-2 focus:ring-[#8A6B55]/10";

const secondaryButtonClassName =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#E8DED4] bg-white px-4 py-2 text-sm font-medium text-[#665044] transition-colors hover:border-[#BDAA99] hover:bg-[#F3EAE1] disabled:cursor-not-allowed disabled:opacity-50";

function isOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus);
}

function formatMoney(
  value: number | string,
  currency = "TND",
): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat("fr-TN", {
      style: "currency",
      currency: currency || "TND",
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(amount);
  } catch {
    return `${amount.toFixed(3)} ${currency || "TND"}`;
  }
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-TN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusLabel(status: string): string {
  return isOrderStatus(status)
    ? ORDER_STATUS_LABELS[status]
    : status;
}

function getStatusClass(status: string): string {
  return isOrderStatus(status)
    ? STATUS_STYLES[status]
    : "border-[#E8DED4] bg-[#F3EAE1] text-[#795A46]";
}

function paymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    unpaid: "Unpaid",
    paid: "Paid",
    failed: "Failed",
    refunded: "Refunded",
  };

  return labels[status] ?? status;
}

function paymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash_on_delivery: "Cash on delivery",
    card: "Bank card",
    bank_transfer: "Bank transfer",
  };

  return labels[method] ?? method;
}

function getSearchableText(order: AdminOrder): string {
  return [
    order.id,
    order.customerName,
    order.customerEmail,
    order.customerPhone,
    order.shippingAddress,
    order.shippingCity,
    order.shippingGovernorate ?? "",
    ...(order.items ?? []).map((item) => item.name),
  ]
    .join(" ")
    .toLowerCase();
}

function isWithinDateFilter(
  dateValue: string,
  filter: DateFilter,
): boolean {
  if (filter === "all") {
    return true;
  }

  const orderDate = new Date(dateValue);

  if (Number.isNaN(orderDate.getTime())) {
    return false;
  }

  const now = new Date();

  if (filter === "today") {
    return orderDate.toDateString() === now.toDateString();
  }

  const days = filter === "7days" ? 7 : 30;
  const startDate = new Date(now);

  startDate.setDate(startDate.getDate() - days);

  return orderDate >= startDate && orderDate <= now;
}

function getOrderProgress(status: string): number {
  const steps: OrderStatus[] = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
  ];

  if (!isOrderStatus(status) || status === "cancelled") {
    return -1;
  }

  return steps.indexOf(status);
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusClass(status)}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isOrderStatus(status)
            ? STATUS_DOTS[status]
            : "bg-[#795A46]"
        }`}
      />
      {getStatusLabel(status)}
    </span>
  );
}

function OrderProgress({ status }: { status: string }) {
  const progress = getOrderProgress(status);

  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-800">
        <X size={17} />
        This order has been cancelled.
      </div>
    );
  }

  if (progress < 0) {
    return null;
  }

  const steps: OrderStatus[] = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
  ];

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-[540px] items-start">
        {steps.map((step, index) => {
          const completed = index <= progress;

          return (
            <div
              key={step}
              className="relative flex flex-1 flex-col items-center"
            >
              {index < steps.length - 1 && (
                <div
                  className={`absolute left-1/2 top-3 h-0.5 w-full ${
                    index < progress
                      ? "bg-[#795A46]"
                      : "bg-[#E8DED4]"
                  }`}
                />
              )}

              <span
                className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                  completed
                    ? "border-[#3B2418] bg-[#3B2418] text-white"
                    : "border-[#D8C9BD] bg-white text-[#A08D7E]"
                }`}
              >
                {completed ? (
                  <CheckCircle2 size={13} />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </span>

              <span
                className={`mt-2 text-center text-[10px] font-semibold sm:text-xs ${
                  completed
                    ? "text-[#3B2418]"
                    : "text-[#A08D7E]"
                }`}
              >
                {ORDER_STATUS_LABELS[step]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  caption,
  icon: Icon,
}: {
  label: string;
  value: number;
  caption: string;
  icon: LucideIcon;
}) {
  return (
    <article className="rounded-2xl border border-[#E8DED4] bg-white p-5 transition-shadow hover:shadow-md hover:shadow-[#3B2418]/5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3EAE1] text-[#795A46]">
          <Icon size={21} strokeWidth={1.6} />
        </div>

        <span className="rounded-full bg-[#F8F5F0] px-2.5 py-1 text-[10px] font-medium text-[#8A6B55]">
          {caption}
        </span>
      </div>

      <p className="mt-5 text-sm text-[#8A7567]">{label}</p>

      <p className="mt-1 text-3xl font-semibold tabular-nums text-[#3B2418]">
        {value}
      </p>
    </article>
  );
}

export function OrdersManager() {
  const router = useRouter();

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(
    null,
  );

  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(
    null,
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const handleAuthorizationFailure = useCallback(
    (status: 401 | 403) => {
      router.replace(
        status === 401 ? "/admin/login" : "/admin/unauthorized",
      );

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

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        return;
      }

      const response = await fetch("/api/admin/orders", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthorizationFailure(response.status);
        return;
      }

      const result = (await response.json().catch(() => null)) as
        | OrdersResponse
        | null;

      if (
        !response.ok ||
        result?.success !== true ||
        !Array.isArray(result.data)
      ) {
        setErrorMessage(
          result?.message ??
            "Unable to load orders. Please try again.",
        );
        return;
      }

      setOrders(result.data);
    } catch (error) {
      console.error("Failed to load admin orders:", error);

      setErrorMessage(
        "Unable to contact the server. Please check your connection.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken, handleAuthorizationFailure]);

  const updateOrderStatus = useCallback(
    async (order: AdminOrder, newStatus: OrderStatus) => {
      if (updatingOrderId !== null) return;
      if (order.status === newStatus) return;

      const allowedStatuses = isOrderStatus(order.status)
        ? NEXT_STATUSES[order.status]
        : [];

      if (!allowedStatuses.includes(newStatus)) {
        setErrorMessage("This status transition is not allowed.");
        return;
      }

      if (newStatus === "cancelled") {
        const confirmed = window.confirm(
          "Are you sure you want to cancel this order? The stock of products and BeanBox components will be restored.",
        );

        if (!confirmed) return;
      }

      setUpdatingOrderId(order.id);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const accessToken = await getAccessToken();

        if (!accessToken) return;

        const response = await fetch(
          `/api/admin/orders/${encodeURIComponent(order.id)}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: newStatus,
            }),
            cache: "no-store",
          },
        );

        if (response.status === 401 || response.status === 403) {
          handleAuthorizationFailure(response.status);
          return;
        }

        const result = (await response.json().catch(() => null)) as
          | StatusUpdateResponse
          | null;

        if (
          !response.ok ||
          result?.success !== true ||
          !result.data ||
          result.data.id !== order.id ||
          !isOrderStatus(result.data.status)
        ) {
          setErrorMessage(
            result?.message ??
              "Unable to update the order status.",
          );
          return;
        }

        const updatedStatus = result.data.status;

        setOrders((currentOrders) =>
          currentOrders.map((currentOrder) =>
            currentOrder.id === order.id
              ? {
                  ...currentOrder,
                  status: updatedStatus,
                }
              : currentOrder,
          ),
        );

        setSuccessMessage(
          updatedStatus === "cancelled"
            ? "Order cancelled. Stock was restored by the server."
            : `Order status updated: ${ORDER_STATUS_LABELS[updatedStatus]}.`,
        );
      } catch (error) {
        console.error("Failed to update order status:", error);

        setErrorMessage(
          "Unable to contact the server to update the order.",
        );
      } finally {
        setUpdatingOrderId(null);
      }
    },
    [
      getAccessToken,
      handleAuthorizationFailure,
      updatingOrderId,
    ],
  );

  // Load orders after the component has mounted.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrders();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadOrders]);

  // Statistics are calculated from the orders returned by the API.
  const statistics = useMemo(() => {
    const count = (status: OrderStatus) =>
      orders.filter((order) => order.status === status).length;

    return {
      total: orders.length,
      pending: count("pending"),
      confirmed: count("confirmed"),
      processing: count("processing"),
      shipped: count("shipped"),
      delivered: count("delivered"),
      cancelled: count("cancelled"),
    };
  }, [orders]);

  // Search and filters.
  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !normalizedSearch ||
        getSearchableText(order).includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      const matchesDate = isWithinDateFilter(
        order.createdAt,
        dateFilter,
      );

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, search, statusFilter, dateFilter]);

  // Sum of non-cancelled orders.
  const totalRevenue = useMemo(
    () =>
      orders
        .filter((order) => order.status !== "cancelled")
        .reduce(
          (total, order) => total + Number(order.total || 0),
          0,
        ),
    [orders],
  );

  const stats = [
    {
      label: "Total orders",
      value: statistics.total,
      caption: "Latest 100",
      icon: ShoppingBag,
    },
    {
      label: "Pending",
      value: statistics.pending,
      caption: "Awaiting review",
      icon: Clock3,
    },
    {
      label: "Confirmed",
      value: statistics.confirmed,
      caption: "Accepted",
      icon: CheckCircle2,
    },
    {
      label: "Processing",
      value: statistics.processing,
      caption: "Preparing",
      icon: Package,
    },
    {
      label: "Shipped",
      value: statistics.shipped,
      caption: "In transit",
      icon: Truck,
    },
    {
      label: "Delivered",
      value: statistics.delivered,
      caption: "Completed",
      icon: CheckCircle2,
    },
    {
      label: "Cancelled",
      value: statistics.cancelled,
      caption: "Cancelled",
      icon: X,
    },
  ];

  return (
    <section className="space-y-8 text-[#3B2418]">
      {/* Page heading */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A8577]">
            BARISTABAR / SALES / ORDERS
          </p>

          <h2
            className="mt-2 text-4xl font-medium tracking-tight text-[#3B2418] sm:text-5xl"
            style={{ fontFamily: "var(--font-brand)" }}
          >
            Order management
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-[#795A46]">
            Track customer orders, review delivery details and manage
            fulfillment from one place.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadOrders()}
          disabled={isLoading || updatingOrderId !== null}
          className={secondaryButtonClassName}
        >
          <RefreshCw
            size={15}
            className={isLoading ? "animate-spin" : ""}
          />
          Refresh orders
        </button>
      </header>

      {/* Statistics */}
      <section
        aria-label="Order statistics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            caption={stat.caption}
            icon={stat.icon}
          />
        ))}
      </section>

      {/* Revenue summary */}
      <section className="flex flex-col gap-4 rounded-2xl border border-[#E8DED4] bg-[#ffffff] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#795A46]">
            Order value
          </p>

          <h3
            className="mt-1 text-3xl font-medium text-[#3B2418]"
            style={{ fontFamily: "var(--font-brand)" }}
          >
            {formatMoney(totalRevenue)}
          </h3>

          <p className="mt-1 text-xs text-[#795A46]">
            Sum of non-cancelled orders in the latest 100 records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/70 text-[#795A46]">
            <CreditCard size={21} />
          </div>

          <div>
            <p className="text-sm font-semibold text-[#3B2418]">
              {statistics.total - statistics.cancelled} active orders
            </p>
            <p className="text-xs text-[#795A46]">
              Excluding cancelled orders
            </p>
          </div>
        </div>
      </section>

      {/* Notifications */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle size={19} className="mt-0.5 shrink-0" />

          <p className="min-w-0 flex-1 font-medium">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            aria-label="Dismiss error"
            className="rounded-full p-1 transition hover:bg-red-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-[#D8E4D2] bg-[#F2F6EF] p-4 text-sm text-[#42613D]"
        >
          <CheckCircle2 size={19} className="mt-0.5 shrink-0" />

          <p className="min-w-0 flex-1 font-medium">
            {successMessage}
          </p>

          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            aria-label="Dismiss success message"
            className="rounded-full p-1 transition hover:bg-green-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Orders list */}
      <section className="overflow-hidden rounded-2xl border border-[#E8DED4] bg-white shadow-sm shadow-[#3B2418]/[0.025]">
        {/* Toolbar */}
        <div className="border-b border-[#E8DED4] bg-[#FBF8F4] px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A8577]">
                Sales overview
              </p>

              <h3
                className="mt-1 text-3xl font-medium text-[#3B2418]"
                style={{ fontFamily: "var(--font-brand)" }}
              >
                All orders
              </h3>

              <p className="mt-1 text-sm text-[#9A8577]">
                {filteredOrders.length} result
                {filteredOrders.length === 1 ? "" : "s"} out of{" "}
                {orders.length} orders.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {/* Search */}
              <div className="relative min-w-0 sm:w-72">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A8577]"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search orders, customers..."
                  aria-label="Search orders"
                  className="min-h-11 w-full rounded-full border border-[#E8DED4] bg-white py-2 pl-10 pr-4 text-sm text-[#3B2418] outline-none transition placeholder:text-[#A08D7E] focus:border-[#8A6B55] focus:ring-2 focus:ring-[#8A6B55]/10"
                />
              </div>

              {/* Status filter */}
              <div className="relative sm:min-w-44">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filter orders by status"
                  className={`${fieldClassName} appearance-none pr-10`}
                >
                  <option value="all">All statuses</option>

                  {ORDER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {ORDER_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A6B55]"
                />
              </div>

              {/* Date filter */}
              <div className="relative sm:min-w-44">
                <select
                  value={dateFilter}
                  onChange={(event) =>
                    setDateFilter(event.target.value as DateFilter)
                  }
                  aria-label="Filter orders by date"
                  className={`${fieldClassName} appearance-none pr-10`}
                >
                  <option value="all">All dates</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                </select>

                <CalendarDays
                  size={15}
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A6B55]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-[#795A46]" />
            <p className="text-sm text-[#8A7567]">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          /* No orders */
          <div className="flex min-h-64 flex-col items-center justify-center px-5 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F3EAE1] text-[#795A46]">
              <ShoppingBag size={25} />
            </div>

            <h3
              className="mt-4 text-2xl font-medium text-[#3B2418]"
              style={{ fontFamily: "var(--font-brand)" }}
            >
              No orders yet
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-[#9A8577]">
              New customer orders will appear here when they are
              successfully saved.
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          /* No filtered results */
          <div className="flex min-h-64 flex-col items-center justify-center px-5 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F3EAE1] text-[#795A46]">
              <Search size={24} />
            </div>

            <h3
              className="mt-4 text-2xl font-medium text-[#3B2418]"
              style={{ fontFamily: "var(--font-brand)" }}
            >
              No matching orders
            </h3>

            <p className="mt-2 text-sm text-[#9A8577]">
              Try another search or change your filters.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setDateFilter("all");
              }}
              className={`${secondaryButtonClassName} mt-5`}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#F0E7DE]">
            {filteredOrders.map((order) => {
              const isExpanded = expandedOrderId === order.id;

              const nextStatuses: OrderStatus[] = isOrderStatus(
                order.status,
              )
                ? NEXT_STATUSES[order.status]
                : [];

              const isUpdating = updatingOrderId === order.id;

              return (
                <article
                  key={order.id}
                  className="transition-colors hover:bg-[#FBF8F4]/50"
                >
                  {/* Order summary */}
                  <div className="flex flex-col gap-4 px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="break-all text-sm font-semibold text-[#3B2418]">
                          Order #{order.id}
                        </p>

                        <StatusBadge status={order.status} />
                      </div>

                      <p className="mt-2 flex items-center gap-2 text-xs text-[#9A8577]">
                        <CalendarDays size={13} />
                        {formatDate(order.createdAt)}
                      </p>

                      <div className="mt-3 flex flex-col gap-1.5">
                        <p className="flex items-center gap-2 text-sm font-semibold text-[#3B2418]">
                          <UserRound size={14} className="text-[#9A8577]" />
                          {order.customerName}
                        </p>

                        <p className="flex items-center gap-2 break-all text-xs text-[#8A7567]">
                          <Mail size={13} className="shrink-0" />
                          {order.customerEmail}
                        </p>

                        <p className="flex items-center gap-2 text-xs text-[#8A7567]">
                          <Phone size={13} className="shrink-0" />
                          {order.customerPhone}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                      <div className="min-w-28 sm:text-right">
                        <p className="text-lg font-semibold tabular-nums text-[#3B2418]">
                          {formatMoney(order.total, order.currency)}
                        </p>

                        <p className="mt-1 text-xs text-[#9A8577]">
                          {paymentStatusLabel(order.paymentStatus)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedOrderId(isExpanded ? null : order.id)
                        }
                        aria-expanded={isExpanded}
                        className={secondaryButtonClassName}
                      >
                        {isExpanded ? (
                          <>
                            Hide details
                            <ChevronDown size={15} />
                          </>
                        ) : (
                          <>
                            View details
                            <ChevronRight size={15} />
                          </>
                        )}
                      </button>

                      <div className="relative min-w-48">
                        <select
                          key={order.status}
                          defaultValue=""
                          disabled={
                            updatingOrderId !== null ||
                            nextStatuses.length === 0
                          }
                          aria-label={`Update status of order ${order.id}`}
                          onChange={(event) => {
                            const selectedStatus = event.target.value;

                            event.target.value = "";

                            if (
                              isOrderStatus(selectedStatus) &&
                              nextStatuses.includes(selectedStatus)
                            ) {
                              void updateOrderStatus(order, selectedStatus);
                            }
                          }}
                          className={`${fieldClassName} appearance-none pr-9`}
                        >
                          <option value="">
                            {isUpdating
                              ? "Updating..."
                              : nextStatuses.length > 0
                                ? "Update status..."
                                : "No action available"}
                          </option>

                          {nextStatuses.map((status) => (
                            <option key={status} value={status}>
                              {ORDER_STATUS_LABELS[status]}
                            </option>
                          ))}
                        </select>

                        {isUpdating ? (
                          <RefreshCw
                            size={14}
                            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-[#8A6B55]"
                          />
                        ) : (
                          <ChevronDown
                            size={14}
                            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A6B55]"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded order details */}
                  {isExpanded && (
                    <div className="space-y-6 border-t border-[#E8DED4] bg-[#FBF8F4] p-5 sm:p-7">
                      {/* Progress */}
                      <section className="rounded-2xl border border-[#E8DED4] bg-white p-5">
                        <div className="mb-5 flex items-center justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-[#3B2418]">
                              Order progress
                            </h3>

                            <p className="mt-1 text-xs text-[#9A8577]">
                              Current fulfillment status
                            </p>
                          </div>

                          <StatusBadge status={order.status} />
                        </div>

                        <OrderProgress status={order.status} />
                      </section>

                      {/* Customer and shipping */}
                      <div className="grid gap-5 lg:grid-cols-2">
                        <section className="rounded-2xl border border-[#E8DED4] bg-white p-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3EAE1] text-[#795A46]">
                              <UserRound size={19} />
                            </div>

                            <div>
                              <h3 className="font-semibold text-[#3B2418]">
                                Customer information
                              </h3>

                              <p className="text-xs text-[#9A8577]">
                                Contact details
                              </p>
                            </div>
                          </div>

                          <dl className="mt-5 space-y-4 text-sm">
                            <div>
                              <dt className="text-xs text-[#9A8577]">
                                Full name
                              </dt>

                              <dd className="mt-1 font-semibold text-[#3B2418]">
                                {order.customerName}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-[#9A8577]">
                                Email address
                              </dt>

                              <dd className="mt-1 break-all font-medium text-[#3B2418]">
                                {order.customerEmail}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-[#9A8577]">
                                Phone number
                              </dt>

                              <dd className="mt-1 font-medium text-[#3B2418]">
                                {order.customerPhone}
                              </dd>
                            </div>
                          </dl>
                        </section>

                        <section className="rounded-2xl border border-[#E8DED4] bg-white p-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3EAE1] text-[#795A46]">
                              <MapPin size={19} />
                            </div>

                            <div>
                              <h3 className="font-semibold text-[#3B2418]">
                                Shipping information
                              </h3>

                              <p className="text-xs text-[#9A8577]">
                                Delivery destination
                              </p>
                            </div>
                          </div>

                          <dl className="mt-5 space-y-4 text-sm">
                            <div>
                              <dt className="text-xs text-[#9A8577]">
                                Governorate
                              </dt>

                              <dd className="mt-1 font-medium text-[#3B2418]">
                                {order.shippingGovernorate || "Not provided"}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-[#9A8577]">
                                City / Delegation
                              </dt>

                              <dd className="mt-1 font-medium text-[#3B2418]">
                                {order.shippingCity || "Not provided"}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-[#9A8577]">
                                Delivery address
                              </dt>

                              <dd className="mt-1 font-medium text-[#3B2418]">
                                {order.shippingAddress || "Not provided"}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-[#9A8577]">
                                Postal code
                              </dt>

                              <dd className="mt-1 font-medium text-[#3B2418]">
                                {order.shippingPostalCode || "Not provided"}
                              </dd>
                            </div>

                            {order.shippingNotes && (
                              <div>
                                <dt className="text-xs text-[#9A8577]">
                                  Delivery instructions
                                </dt>

                                <dd className="mt-1 whitespace-pre-wrap font-medium text-[#3B2418]">
                                  {order.shippingNotes}
                                </dd>
                              </div>
                            )}
                          </dl>
                        </section>
                      </div>

                      {/* Order items */}
                      <section className="overflow-hidden rounded-2xl border border-[#E8DED4] bg-white">
                        <div className="flex items-center gap-3 border-b border-[#E8DED4] bg-[#FBF8F4] px-5 py-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3EAE1] text-[#795A46]">
                            <Package size={19} />
                          </div>

                          <div>
                            <h3 className="font-semibold text-[#3B2418]">
                              Ordered items
                            </h3>

                            <p className="text-xs text-[#9A8577]">
                              {order.items.length} item
                              {order.items.length === 1 ? "" : "s"}
                            </p>
                          </div>
                        </div>

                        {order.items.length === 0 ? (
                          <p className="p-6 text-sm text-[#9A8577]">
                            No items are associated with this order.
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px] text-left text-sm">
                              <thead className="bg-white text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9A8577]">
                                <tr>
                                  <th className="px-5 py-4">Item</th>
                                  <th className="px-5 py-4">Type</th>
                                  <th className="px-5 py-4">Quantity</th>
                                  <th className="px-5 py-4">Unit price</th>
                                  <th className="px-5 py-4">Line total</th>
                                </tr>
                              </thead>

                              <tbody className="divide-y divide-[#F0E7DE]">
                                {order.items.map((item) => (
                                  <tr key={item.id}>
                                    <td className="px-5 py-4">
                                      <p className="font-semibold text-[#3B2418]">
                                        {item.name}
                                      </p>

                                      {item.configurationLabel && (
                                        <p className="mt-1 text-xs text-[#9A8577]">
                                          {item.configurationLabel}
                                        </p>
                                      )}

                                      {item.slug && (
                                        <p className="mt-1 text-[10px] text-[#A08D7E]">
                                          {item.slug}
                                        </p>
                                      )}
                                    </td>

                                    <td className="px-5 py-4">
                                      <span className="rounded-full bg-[#F3EAE1] px-3 py-1 text-xs font-medium text-[#795A46]">
                                        {item.type === "beanbox"
                                          ? "BeanBox"
                                          : "Product"}
                                      </span>
                                    </td>

                                    <td className="px-5 py-4 tabular-nums text-[#665044]">
                                      {item.quantity}
                                    </td>

                                    <td className="whitespace-nowrap px-5 py-4 tabular-nums text-[#665044]">
                                      {formatMoney(item.unitPrice, order.currency)}
                                    </td>

                                    <td className="whitespace-nowrap px-5 py-4 font-semibold tabular-nums text-[#3B2418]">
                                      {formatMoney(item.lineTotal, order.currency)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </section>

                      {/* Payment and totals */}
                      <div className="grid gap-5 lg:grid-cols-2">
                        <section className="rounded-2xl border border-[#E8DED4] bg-white p-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3EAE1] text-[#795A46]">
                              <CreditCard size={19} />
                            </div>

                            <div>
                              <h3 className="font-semibold text-[#3B2418]">
                                Payment information
                              </h3>

                              <p className="text-xs text-[#9A8577]">
                                Payment method and status
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 space-y-4 text-sm">
                            <div>
                              <p className="text-xs text-[#9A8577]">
                                Payment method
                              </p>

                              <p className="mt-1 font-semibold text-[#3B2418]">
                                {paymentMethodLabel(order.paymentMethod)}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-[#9A8577]">
                                Payment status
                              </p>

                              <p className="mt-1 font-semibold text-[#3B2418]">
                                {paymentStatusLabel(order.paymentStatus)}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-[#9A8577]">
                                Currency
                              </p>

                              <p className="mt-1 font-semibold text-[#3B2418]">
                                {order.currency}
                              </p>
                            </div>
                          </div>
                        </section>

                        <section className="rounded-2xl border border-[#E8DED4] bg-white p-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3EAE1] text-[#795A46]">
                              <ShoppingBag size={19} />
                            </div>

                            <div>
                              <h3 className="font-semibold text-[#3B2418]">
                                Order summary
                              </h3>

                              <p className="text-xs text-[#9A8577]">
                                Price breakdown
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 space-y-3 text-sm">
                            <div className="flex justify-between gap-4">
                              <span className="text-[#8A7567]">
                                Subtotal
                              </span>

                              <span className="font-medium text-[#3B2418]">
                                {formatMoney(order.subtotal, order.currency)}
                              </span>
                            </div>

                            <div className="flex justify-between gap-4">
                              <span className="text-[#8A7567]">
                                Delivery fee
                              </span>

                              <span className="font-medium text-[#3B2418]">
                                {formatMoney(order.deliveryFee, order.currency)}
                              </span>
                            </div>

                            <div className="flex justify-between gap-4 border-t border-[#E8DED4] pt-4">
                              <span className="font-semibold text-[#3B2418]">
                                Total
                              </span>

                              <span className="text-lg font-semibold tabular-nums text-[#3B2418]">
                                {formatMoney(order.total, order.currency)}
                              </span>
                            </div>
                          </div>
                        </section>
                      </div>

                      {/* Order actions */}
                      <div className="flex flex-wrap justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setExpandedOrderId(null)}
                          className={secondaryButtonClassName}
                        >
                          Close details
                        </button>

                        {nextStatuses.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-[#9A8577]">
                            <ArrowRight size={14} />
                            Use the status selector above to continue fulfillment.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {!isLoading && orders.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-[#E8DED4] bg-[#FBF8F4] px-5 py-4 text-xs text-[#9A8577] sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <span>
              Showing {filteredOrders.length} of {orders.length} loaded orders.
            </span>

            <span>
              The API currently returns the latest 100 orders.
            </span>
          </div>
        )}
      </section>
    </section>
  );
}
