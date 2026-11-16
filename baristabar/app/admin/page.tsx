import Image from "next/image";
import Link from "next/link";

import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Clock3,
  Coffee,
  Package,
  ShoppingBag,
  Tags,
  Users,
  WalletCards,
} from "lucide-react";

import { AdminHeader } from "@/components/admin/organisms/AdminHeader/AdminHeader";
import { AdminSignOutButton } from "@/components/admin/organisms/AdminSignOutButton/AdminSignOutButton";
import { requireAdmin } from "@/lib/supabase/admin";
import { findActiveProducts } from "@/lib/products-repository";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

const LOW_STOCK_THRESHOLD = 5;

const formatPrice = (price: number | string) =>
  new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(Number(price));

const formatDate = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-TN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Tunis",
  }).format(date);
};

const orderStatusLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const orderStatusStyles: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800",
  confirmed: "bg-sky-50 text-sky-800",
  processing: "bg-violet-50 text-violet-800",
  shipped: "bg-indigo-50 text-indigo-800",
  delivered: "bg-emerald-50 text-emerald-800",
  cancelled: "bg-red-50 text-red-800",
};

const paymentStatusLabels: Record<string, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

const paymentStatusStyles: Record<string, string> = {
  unpaid: "text-amber-700",
  paid: "text-emerald-700",
  failed: "text-red-700",
  refunded: "text-violet-700",
};

type CustomerMetricsRow = {
  total_customers: string;
  active_customers: string;
  suspended_customers: string;
};

type OrderMetricsRow = {
  total_orders: string;
  pending_orders: string;
  paid_revenue: string;
};

type RecentOrderRow = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  total: string;
  status: string;
  payment_status: string;
  created_at: Date | string;
};

export default async function Home() {
  await requireAdmin();

  let products: Awaited<ReturnType<typeof findActiveProducts>> = [];
  let error: string | null = null;

  try {
    products = await findActiveProducts();
  } catch (cause) {
    console.error("Unable to load admin dashboard products:", cause);
    error = "Unable to load the product catalog from the database.";
  }

  const totalStock = products.reduce(
    (total, product) => total + Number(product.stock || 0),
    0,
  );

  const lowStockProducts = products
    .filter((product) => Number(product.stock || 0) <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0))
    .slice(0, 5);

  let customerMetrics: {
    totalCustomers: number;
    activeCustomers: number;
    suspendedCustomers: number;
  } | null = null;
  let customersError: string | null = null;

  try {
    const { rows } = await getPool().query<CustomerMetricsRow>(`
      SELECT
        COUNT(*)::text AS total_customers,
        COUNT(*) FILTER (WHERE account_status = 'active')::text AS active_customers,
        COUNT(*) FILTER (WHERE account_status = 'suspended')::text AS suspended_customers
      FROM public.profiles
      WHERE role = 'customer'
    `);

    customerMetrics = {
      totalCustomers: Number(rows[0]?.total_customers ?? 0),
      activeCustomers: Number(rows[0]?.active_customers ?? 0),
      suspendedCustomers: Number(rows[0]?.suspended_customers ?? 0),
    };
  } catch (cause) {
    console.error("Unable to load admin dashboard customer metrics:", cause);
    customersError = "Customer statistics are currently unavailable.";
  }

  let orderMetrics: {
    totalOrders: number;
    pendingOrders: number;
    paidRevenue: number;
  } | null = null;
  let recentOrders: RecentOrderRow[] = [];
  let ordersError: string | null = null;

  try {
    const pool = getPool();
    const [metricsResult, recentOrdersResult] = await Promise.all([
      pool.query<OrderMetricsRow>(`
        SELECT
          COUNT(*)::text AS total_orders,
          COUNT(*) FILTER (WHERE status = 'pending')::text AS pending_orders,
          COALESCE(
            SUM(total) FILTER (
              WHERE payment_status = 'paid' AND status <> 'cancelled'
            ),
            0
          )::text AS paid_revenue
        FROM public.orders
      `),
      pool.query<RecentOrderRow>(`
        SELECT
          id::text AS id,
          customer_name,
          customer_email,
          total::text AS total,
          status,
          payment_status,
          created_at
        FROM public.orders
        ORDER BY created_at DESC
        LIMIT 5
      `),
    ]);

    const metrics = metricsResult.rows[0];
    orderMetrics = {
      totalOrders: Number(metrics?.total_orders ?? 0),
      pendingOrders: Number(metrics?.pending_orders ?? 0),
      paidRevenue: Number(metrics?.paid_revenue ?? 0),
    };
    recentOrders = recentOrdersResult.rows;
  } catch (cause) {
    console.error("Unable to load admin dashboard order metrics:", cause);
    ordersError = "Order statistics are currently unavailable.";
  }

  const quickLinks = [
    {
      title: "Products",
      description: "Manage your catalog, prices, and product images.",
      href: "/admin/products",
      icon: Package,
    },
    {
      title: "Categories",
      description: "Organize your products into collections.",
      href: "/admin/categories",
      icon: Tags,
    },
    {
      title: "Orders",
      description: "Review and manage customer orders.",
      href: "/admin/orders",
      icon: ShoppingBag,
    },
    {
      title: "Customers",
      description: "View customer activity and manage account status.",
      href: "/admin/customers",
      icon: Users,
    },
  ];

  return (
    <main className="min-h-screen bg-[#FBF8F4] text-[#3B2418]">
      <AdminHeader />

      <div className="mx-auto max-w-360 space-y-8 px-4 py-7 sm:px-8 sm:py-9 lg:px-12">
        {/* Page heading */}
        <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A6B55]">
              <span>BARISTABAR</span>
              <span className="h-1 w-1 rounded-full bg-[#BDAA99]" />
              <span>ADMINISTRATION</span>
            </div>

            <h1
              className="text-4xl font-medium tracking-tight text-[#3B2418] sm:text-5xl"
              style={{ fontFamily: "var(--font-brand)" }}
            >
              Dashboard
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#795A46]">
              An overview of your store, customers, sales, inventory, and orders.
            </p>
          </div>

          <AdminSignOutButton />
        </section>

        {/* Landing-page image banner */}
        <section className="relative isolate min-h-77.5 overflow-hidden rounded-2xl bg-[#1C100C] shadow-lg shadow-[#3B2418]/10 sm:min-h-82.5">
          <Image
            src="/hero-coffee.jpeg"
            alt=""
            fill
            priority
            sizes="(max-width: 1440px) 100vw, 1440px"
            className="object-cover object-center"
          />

          {/* Same dark overlay as the storefront HeroSection */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-r from-[#1C100C]/95 via-[#1C100C]/75 to-[#1C100C]/15"
          />

          <div className="relative z-10 flex min-h-77.5 items-center px-6 py-9 sm:min-h-82.5 sm:px-10 lg:px-12">
            <div className="max-w-2xl">
              <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#D6BDA7] sm:text-xs">
                Specialty Coffee <span className="mx-1.5">·</span>
                Roasted Weekly
              </p>

              <h2
                className="text-4xl leading-[1.02] tracking-[-0.04em] text-[#F8F2EB] sm:text-5xl lg:text-6xl"
                style={{ fontFamily: "var(--font-brand)" }}
              >
                Your store.
                <br />
                <span className="font-normal italic">Your coffee story.</span>
              </h2>

              <p className="mt-5 max-w-lg text-sm leading-6 text-[#E4D7CE] sm:text-base">
                Manage your products, follow customer activity, and take care
                of every order from one place.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/admin/products"
                  className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-[#F8F2EB] px-6 text-xs font-semibold uppercase tracking-[0.13em] text-[#382319] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white"
                >
                  Manage Products
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>

                <Link
                  href="/admin/orders"
                  className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-md border border-white/40 bg-white/3 px-6 text-xs font-semibold uppercase tracking-[0.12em] text-[#F8F2EB] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-white hover:bg-white/10"
                >
                  View Orders
                  <ArrowUpRight
                    size={15}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>

                <Link
                  href="/admin/customers"
                  className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-md border border-white/40 bg-white/3 px-6 text-xs font-semibold uppercase tracking-[0.12em] text-[#F8F2EB] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-white hover:bg-white/10"
                >
                  View Customers
                  <ArrowUpRight
                    size={15}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Data errors */}
        {(error || ordersError || customersError) && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <p className="font-semibold">Some data is temporarily unavailable.</p>
            {error && <p className="mt-1">{error}</p>}
            {ordersError && <p className="mt-1">{ordersError}</p>}
            {customersError && <p className="mt-1">{customersError}</p>}
          </div>
        )}

        {/* Statistics */}
        <section>
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A8577]">
              Store overview
            </p>

            <h2
              className="mt-1 text-2xl font-medium text-[#3B2418]"
              style={{ fontFamily: "var(--font-brand)" }}
            >
              Your store at a glance
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <article className="group rounded-2xl border border-[#E8DED4] bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#3B2418]/5">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3EAE1] text-[#795A46]">
                  <Package size={21} strokeWidth={1.6} />
                </div>
                <span className="rounded-full bg-[#F8F5F0] px-2.5 py-1 text-[10px] font-medium text-[#8A6B55]">
                  Catalog
                </span>
              </div>
              <p className="mt-5 text-sm text-[#8A7567]">Active products</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-[#3B2418]">
                {products.length}
              </p>
              <Link
                href="/admin/products"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#795A46] transition-colors hover:text-[#3B2418]"
              >
                Manage products <ArrowRight size={13} />
              </Link>
            </article>

            <article className="group rounded-2xl border border-[#E8DED4] bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#3B2418]/5">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3EAE1] text-[#795A46]">
                  <Boxes size={21} strokeWidth={1.6} />
                </div>
                <span className="rounded-full bg-[#F8F5F0] px-2.5 py-1 text-[10px] font-medium text-[#8A6B55]">
                  Inventory
                </span>
              </div>
              <p className="mt-5 text-sm text-[#8A7567]">Total stock available</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-[#3B2418]">
                {totalStock}
              </p>
              <p className="mt-4 text-xs text-[#9A8577]">
                Units across active products.
              </p>
            </article>

            <article className="group rounded-2xl border border-[#E8DED4] bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#3B2418]/5">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3EAE1] text-[#795A46]">
                  <Users size={21} strokeWidth={1.6} />
                </div>
                <span className="rounded-full bg-[#F8F5F0] px-2.5 py-1 text-[10px] font-medium text-[#8A6B55]">
                  Community
                </span>
              </div>
              <p className="mt-5 text-sm text-[#8A7567]">Active customers</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-[#3B2418]">
                {customerMetrics?.activeCustomers ?? "—"}
              </p>
              <p className="mt-4 text-xs text-[#9A8577]">
                {customerMetrics
                  ? `${customerMetrics.totalCustomers} total · ${customerMetrics.suspendedCustomers} suspended`
                  : "Customer statistics unavailable."}
              </p>
              <Link
                href="/admin/customers"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#795A46] transition-colors hover:text-[#3B2418]"
              >
                Manage customers <ArrowRight size={13} />
              </Link>
            </article>

            <article className="group rounded-2xl border border-[#E8DED4] bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#3B2418]/5">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3EAE1] text-[#795A46]">
                  <WalletCards size={21} strokeWidth={1.6} />
                </div>
                <span className="rounded-full bg-[#F8F5F0] px-2.5 py-1 text-[10px] font-medium text-[#8A6B55]">
                  Payments
                </span>
              </div>
              <p className="mt-5 text-sm text-[#8A7567]">Paid revenue</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-[#3B2418] sm:text-3xl">
                {orderMetrics ? formatPrice(orderMetrics.paidRevenue) : "—"}
              </p>
              <p className="mt-4 text-xs text-[#9A8577]">
                Paid orders only; cancelled orders excluded.
              </p>
            </article>

            <article className="group rounded-2xl border border-[#E8DED4] bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#3B2418]/5">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3EAE1] text-[#795A46]">
                  <ShoppingBag size={21} strokeWidth={1.6} />
                </div>
                <span className="rounded-full bg-[#F8F5F0] px-2.5 py-1 text-[10px] font-medium text-[#8A6B55]">
                  Activity
                </span>
              </div>
              <p className="mt-5 text-sm text-[#8A7567]">Total orders</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-[#3B2418]">
                {orderMetrics?.totalOrders ?? "—"}
              </p>
              <Link
                href="/admin/orders"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#795A46] transition-colors hover:text-[#3B2418]"
              >
                View orders <ArrowRight size={13} />
              </Link>
            </article>

            <article className="group rounded-2xl border border-[#D8C5B2] bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#3B2418]/5">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3EAE1] text-[#795A46]">
                  <Clock3 size={21} strokeWidth={1.6} />
                </div>
                <span className="rounded-full bg-[#F8F5F0] px-2.5 py-1 text-[10px] font-medium text-[#795A46]">
                  To process
                </span>
              </div>
              <p className="mt-5 text-sm text-[#795A46]">Pending orders</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-[#3B2418]">
                {orderMetrics?.pendingOrders ?? "—"}
              </p>
              <Link
                href="/admin/orders"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#795A46] transition-colors hover:text-[#3B2418]"
              >
                Process orders <ArrowRight size={13} />
              </Link>
            </article>
          </div>
        </section>

        {/* Recent orders */}
        <section className="overflow-hidden rounded-2xl border border-[#E8DED4] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8DED4] px-5 py-5 sm:px-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A8577]">
                Store activity
              </p>
              <h2
                className="mt-1 text-2xl font-medium text-[#3B2418]"
                style={{ fontFamily: "var(--font-brand)" }}
              >
                Recent orders
              </h2>
              <p className="mt-1 text-xs text-[#9A8577]">
                The five latest orders received by your store.
              </p>
            </div>

            <Link
              href="/admin/orders"
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#3B2418]/15 px-3.5 py-2 text-xs font-semibold text-[#795A46] transition-colors hover:border-[#3B2418]/30 hover:bg-[#FBF8F4]"
            >
              View all orders <ArrowUpRight size={14} />
            </Link>
          </div>

          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-190 text-left text-sm">
                <thead className="bg-[#FBF8F4] text-[#8A7567]">
                  <tr>
                    <th className="px-5 py-3.5 font-medium sm:px-6">Order</th>
                    <th className="px-5 py-3.5 font-medium">Customer</th>
                    <th className="px-5 py-3.5 font-medium">Date</th>
                    <th className="px-5 py-3.5 font-medium">Total</th>
                    <th className="px-5 py-3.5 font-medium">Status</th>
                    <th className="px-5 py-3.5 font-medium">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E7DE]">
                  {recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="transition-colors hover:bg-[#FBF8F4]/80"
                    >
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#3B2418] sm:px-6">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-5 py-4">
                        <p className="max-w-48 truncate font-medium text-[#3B2418]">
                          {order.customer_name || "Customer"}
                        </p>
                        <p className="mt-1 max-w-48 truncate text-xs text-[#A08D7E]">
                          {order.customer_email || "—"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-[#795A46]">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#3B2418]">
                        {formatPrice(order.total)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            orderStatusStyles[order.status] ||
                            "bg-[#F3EAE1] text-[#795A46]"
                          }`}
                        >
                          {orderStatusLabels[order.status] || order.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold">
                        <span
                          className={
                            paymentStatusStyles[order.payment_status] ||
                            "text-[#795A46]"
                          }
                        >
                          {paymentStatusLabels[order.payment_status] ||
                            order.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F3EAE1] text-[#795A46]">
                <ShoppingBag size={21} strokeWidth={1.5} />
              </div>
              <h3
                className="mt-3 text-xl font-medium text-[#3B2418]"
                style={{ fontFamily: "var(--font-brand)" }}
              >
                {ordersError ? "Orders unavailable" : "No orders yet"}
              </h3>
              <p className="mt-1 text-sm text-[#9A8577]">
                {ordersError
                  ? "Recent orders could not be loaded right now."
                  : "New customer orders will appear here."}
              </p>
            </div>
          )}
        </section>

        {/* Product catalog and quick links */}
        <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="overflow-hidden rounded-2xl border border-[#E8DED4] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8DED4] px-5 py-5 sm:px-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A8577]">
                  Catalog
                </p>
                <h2
                  className="mt-1 text-2xl font-medium text-[#3B2418]"
                  style={{ fontFamily: "var(--font-brand)" }}
                >
                  Active products
                </h2>
                <p className="mt-1 text-xs text-[#9A8577]">
                  Products currently available in your storefront.
                </p>
              </div>

              <Link
                href="/admin/products"
                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#3B2418]/15 px-3.5 py-2 text-xs font-semibold text-[#795A46] transition-colors hover:border-[#3B2418]/30 hover:bg-[#FBF8F4]"
              >
                View all <ArrowUpRight size={14} />
              </Link>
            </div>

            {products.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-155 text-left text-sm">
                  <thead className="bg-[#FBF8F4] text-[#8A7567]">
                    <tr>
                      <th className="px-5 py-3.5 font-medium sm:px-6">Product</th>
                      <th className="px-5 py-3.5 font-medium">Category</th>
                      <th className="px-5 py-3.5 font-medium">Price</th>
                      <th className="px-5 py-3.5 font-medium">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0E7DE]">
                    {products.map((product) => (
                      <tr
                        key={product.id}
                        className="transition-colors hover:bg-[#FBF8F4]/80"
                      >
                        <td className="px-5 py-4 sm:px-6">
                          <p className="font-medium text-[#3B2418]">
                            {product.name}
                          </p>
                          <p className="mt-1 max-w-56 truncate text-xs text-[#A08D7E]">
                            {product.slug}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-[#795A46]">
                          {product.category}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 font-medium text-[#3B2418]">
                          {formatPrice(product.price)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-2 text-xs font-medium ${
                              Number(product.stock) <= 0
                                ? "text-red-700"
                                : Number(product.stock) <= LOW_STOCK_THRESHOLD
                                  ? "text-amber-700"
                                  : "text-[#795A46]"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                Number(product.stock) <= 0
                                  ? "bg-red-500"
                                  : Number(product.stock) <= LOW_STOCK_THRESHOLD
                                    ? "bg-amber-500"
                                    : "bg-[#8A9B77]"
                              }`}
                            />
                            {product.stock}
                            {Number(product.stock) <= 0
                              ? " · Out of stock"
                              : Number(product.stock) <= LOW_STOCK_THRESHOLD
                                ? " · Low stock"
                                : " · Available"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : !error ? (
              <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F3EAE1] text-[#795A46]">
                  <Package size={25} strokeWidth={1.5} />
                </div>
                <h3
                  className="mt-4 text-xl font-medium text-[#3B2418]"
                  style={{ fontFamily: "var(--font-brand)" }}
                >
                  No active products
                </h3>
                <p className="mt-1 max-w-sm text-sm text-[#9A8577]">
                  Add your first product to start building your catalog.
                </p>
                <Link
                  href="/admin/products"
                  className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#3B2418] px-4 py-2 text-sm font-medium text-[#FBF8F4] transition-colors hover:bg-[#684733]"
                >
                  Add a product <ArrowRight size={15} />
                </Link>
              </div>
            ) : null}
          </div>

          {/* Quick links and inventory alerts */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-[#D8C5B2] bg-white p-5">
              <div className="flex items-center gap-2 text-[#795A46]">
                <AlertTriangle size={17} strokeWidth={1.7} />
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                  Inventory attention
                </p>
              </div>
              <h2
                className="mt-2 text-2xl font-medium text-[#3B2418]"
                style={{ fontFamily: "var(--font-brand)" }}
              >
                Low stock
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#9A8577]">
                Active products with {LOW_STOCK_THRESHOLD} units or fewer.
              </p>

              {lowStockProducts.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {lowStockProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-3 border-b border-[#F0E7DE] pb-3 last:border-0 last:pb-0"
                    >
                      <p className="min-w-0 truncate text-sm font-medium text-[#3B2418]">
                        {product.name}
                      </p>
                      <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-amber-800">
                        {Number(product.stock || 0)} left
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-[#FBF8F4] px-3 py-3 text-xs leading-5 text-[#795A46]">
                  {error
                    ? "Inventory alerts are unavailable while the catalog is loading."
                    : "No low-stock products. Your active inventory looks good."}
                </p>
              )}

              <Link
                href="/admin/products"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#795A46] transition-colors hover:text-[#3B2418]"
              >
                Review inventory <ArrowRight size={13} />
              </Link>
            </div>

            <div className="rounded-2xl border border-[#E8DED4] bg-white p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A8577]">
                Navigation
              </p>
              <h2
                className="mt-1 text-2xl font-medium text-[#3B2418]"
                style={{ fontFamily: "var(--font-brand)" }}
              >
                Quick access
              </h2>

              <div className="mt-4 space-y-2">
                {quickLinks.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex items-center gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-[#E8DED4] hover:bg-[#FBF8F4]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F3EAE1] text-[#795A46]">
                        <Icon size={19} strokeWidth={1.6} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#3B2418]">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-xs leading-5 text-[#9A8577]">
                          {item.description}
                        </p>
                      </div>
                      <ArrowRight
                        size={16}
                        className="shrink-0 text-[#A28A79] transition-transform group-hover:translate-x-1 group-hover:text-[#3B2418]"
                      />
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-[#E8DED4] bg-white p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3EAE1] text-[#795A46]">
                <Coffee size={20} strokeWidth={1.6} />
              </div>
              <h3
                className="mt-4 text-2xl font-medium text-[#3B2418]"
                style={{ fontFamily: "var(--font-brand)" }}
              >
                BaristaBar
              </h3>
              <p className="mt-1 text-sm leading-6 text-[#795A46]">
                Discover your coffee. Brew your experience.
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#3B2418] transition-colors hover:text-[#8A6B55]"
              >
                Visit storefront <ArrowUpRight size={14} />
              </Link>
            </div>
          </aside>
        </section>

        <footer className="flex flex-col gap-2 border-t border-[#E8DED4] pt-5 text-xs text-[#A08D7E] sm:flex-row sm:items-center sm:justify-between">
          <p>BaristaBar · Administration</p>
          <p>Discover your coffee. Brew your experience.</p>
        </footer>
      </div>
    </main>
  );
}
