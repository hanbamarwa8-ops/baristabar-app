import Image from "next/image";
import Link from "next/link";

import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Clock3,
  Coffee,
  Package,
  ShoppingBag,
  Tags,
} from "lucide-react";

import { AdminHeader } from "@/components/admin/organisms/AdminHeader/AdminHeader";
import { AdminSignOutButton } from "@/components/admin/organisms/AdminSignOutButton/AdminSignOutButton";
import { requireAdmin } from "@/lib/supabase/admin";
import { findActiveProducts } from "@/lib/products-repository";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

const formatPrice = (price: number | string) =>
  new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(Number(price));

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

  let totalOrders = 0;
  let pendingOrders = 0;
  let ordersError: string | null = null;

  try {
    const { rows } = await getPool().query<{
      total_orders: string;
      pending_orders: string;
    }>(`
      SELECT
        COUNT(*)::text AS total_orders,
        COUNT(*) FILTER (WHERE status = 'pending')::text AS pending_orders
      FROM public.orders
    `);

    totalOrders = Number(rows[0]?.total_orders ?? 0);
    pendingOrders = Number(rows[0]?.pending_orders ?? 0);
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
              An overview of your store, catalog, inventory, and orders.
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
                <span className="font-normal italic">
                  Your coffee story.
                </span>
              </h2>

              <p className="mt-5 max-w-lg text-sm leading-6 text-[#E4D7CE] sm:text-base">
                Manage your products, keep track of inventory, and take care
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
              </div>
            </div>
          </div>
        </section>

        {/* Data errors */}
        {(error || ordersError) && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <p className="font-semibold">
              Some data is temporarily unavailable.
            </p>

            {error && <p className="mt-1">{error}</p>}
            {ordersError && <p className="mt-1">{ordersError}</p>}
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

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="group rounded-2xl border border-[#E8DED4] bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#3B2418]/5">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3EAE1] text-[#795A46]">
                  <Package size={21} strokeWidth={1.6} />
                </div>

                <span className="rounded-full bg-[#F8F5F0] px-2.5 py-1 text-[10px] font-medium text-[#8A6B55]">
                  Catalog
                </span>
              </div>

              <p className="mt-5 text-sm text-[#8A7567]">
                Active products
              </p>

              <p className="mt-1 text-3xl font-semibold tabular-nums text-[#3B2418]">
                {products.length}
              </p>

              <Link
                href="/admin/products"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#795A46] transition-colors hover:text-[#3B2418]"
              >
                Manage products
                <ArrowRight size={13} />
              </Link>
            </article>

            <article className="group rounded-2xl border border-[#E8DED4] bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#3B2418]/5">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl  bg-[#F3EAE1] text-[#795A46]">
                  <Boxes size={21} strokeWidth={1.6} />
                </div>

                <span className="rounded-full bg-[#F8F5F0] px-2.5 py-1 text-[10px] font-medium text-[#8A6B55]">
                  Inventory
                </span>
              </div>

              <p className="mt-5 text-sm text-[#8A7567]">
                Total stock available
              </p>

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
                  <ShoppingBag size={21} strokeWidth={1.6} />
                </div>

                <span className="rounded-full bg-[#F8F5F0] px-2.5 py-1 text-[10px] font-medium text-[#8A6B55]">
                  Activity
                </span>
              </div>

              <p className="mt-5 text-sm text-[#8A7567]">
                Total orders
              </p>

              <p className="mt-1 text-3xl font-semibold tabular-nums text-[#3B2418]">
                {totalOrders}
              </p>

              <Link
                href="/admin/orders"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#795A46] transition-colors hover:text-[#3B2418]"
              >
                View orders
                <ArrowRight size={13} />
              </Link>
            </article>

            <article className="group rounded-2xl border border-[#D8C5B2] bg-[#ffffff] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#3B2418]/5">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl  bg-[#F3EAE1] text-[#795A46]">
                  <Clock3 size={21} strokeWidth={1.6} />
                </div>

                <span className="rounded-full bg-[#F8F5F0]/70 px-2.5 py-1 text-[10px] font-medium text-[#795A46]">
                  To process
                </span>
              </div>

              <p className="mt-5 text-sm text-[#795A46]">
                Pending orders
              </p>

              <p className="mt-1 text-3xl font-semibold tabular-nums text-[#3B2418]">
                {pendingOrders}
              </p>

              <Link
                href="/admin/orders"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#795A46] transition-colors hover:text-[#3B2418]"
              >
                Process orders
                <ArrowRight size={13} />
              </Link>
            </article>
          </div>
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
                View all
                <ArrowUpRight size={14} />
              </Link>
            </div>

            {products.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-155 text-left text-sm">
                  <thead className="bg-[#FBF8F4] text-[#8A7567]">
                    <tr>
                      <th className="px-5 py-3.5 font-medium sm:px-6">
                        Product
                      </th>

                      <th className="px-5 py-3.5 font-medium">
                        Category
                      </th>

                      <th className="px-5 py-3.5 font-medium">
                        Price
                      </th>

                      <th className="px-5 py-3.5 font-medium">
                        Stock
                      </th>
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
                                : "text-[#795A46]"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                Number(product.stock) <= 0
                                  ? "bg-red-500"
                                  : "bg-[#8A9B77]"
                              }`}
                            />

                            {product.stock}
                            {Number(product.stock) <= 0
                              ? " · Out of stock"
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
                  Add a product
                  <ArrowRight size={15} />
                </Link>
              </div>
            ) : null}
          </div>

          {/* Quick links */}
          <aside className="space-y-4">
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

            <div className="rounded-2xl border border-[#E8DED4]  bg-white p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl  bg-[#F3EAE1] text-[#795A46]">
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
                Visit storefront
                <ArrowUpRight size={14} />
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
