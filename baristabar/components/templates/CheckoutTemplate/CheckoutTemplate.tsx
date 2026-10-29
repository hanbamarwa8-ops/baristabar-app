"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

import { useCart } from "@/components/providers/CartProvider";
import {
  TUNISIAN_GOVERNORATES,
  TUNISIAN_LOCATIONS,
} from "@/lib/tunisia-locations";

interface CheckoutTemplateProps {
  userEmail: string;
}

interface CreatedOrder {
  id: string;
  status: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  createdAt: string;
  replayed?: boolean;
}

interface DryRunValidation {
  itemCount: number;
  productsChecked: number;
  subtotal: string;
  deliveryFee: string;
  total: string;
}

interface OrderApiResponse {
  success?: boolean;
  message?: string;
  dryRun?: boolean;
  validation?: DryRunValidation;
  order?: CreatedOrder;
}

const OTHER_TOWN_OPTION = "__other__";

function formatMoney(value: number | string): string {
  const amount = Number(value);
  return `${Number.isFinite(amount) ? amount.toFixed(3) : "0.000"} DT`;
}

function createIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

export default function CheckoutTemplate({ userEmail }: CheckoutTemplateProps) {
  const { items, itemCount, subtotal, isHydrated, clearCart } = useCart();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [dryRunResult, setDryRunResult] = useState<DryRunValidation | null>(
    null
  );

  const [selectedGovernorate, setSelectedGovernorate] = useState("");
  const [selectedTown, setSelectedTown] = useState("");
  const [customTown, setCustomTown] = useState("");

  const idempotencyKeyRef = useRef<string | null>(null);
  const submittingRef = useRef(false);

  const hasBeanBox = items.some((item) => item.kind === "beanbox");
  const hasStandardProduct = items.some((item) => item.kind !== "beanbox");

  const estimatedFreeDelivery =
    (hasBeanBox && hasStandardProduct) || subtotal > 200;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current || items.length === 0) return;

    const form = event.currentTarget;

    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    const orderItems: Array<Record<string, unknown>> = [];

    for (const item of items) {
      if (item.kind === "beanbox") {
        if (!item.boxSlug || !item.contents || item.contents.length === 0) {
          setErrorMessage(
            "One of your BeanBox selections is incomplete. Please return to your bag and check it."
          );
          return;
        }

        orderItems.push({
          type: "beanbox",
          boxSlug: item.boxSlug,
          componentSlugs: item.contents.map((content) => content.slug),
          quantity: item.quantity,
        });
      } else {
        orderItems.push({
          type: "product",
          productId: item.id,
          quantity: item.quantity,
        });
      }
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);
    setNeedsSignIn(false);

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = createIdempotencyKey();
    }

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idempotencyKey: idempotencyKeyRef.current,
          customerName: String(formData.get("customerName") ?? "").trim(),
          customerPhone: String(formData.get("customerPhone") ?? "").trim(),
          shippingAddress: String(formData.get("shippingAddress") ?? "").trim(),
          shippingGovernorate: String(
            formData.get("shippingGovernorate") ?? ""
          ).trim(),

          shippingCity: String(formData.get("shippingCity") ?? "").trim(),

          shippingCityIsCustom: selectedTown === OTHER_TOWN_OPTION,

          shippingPostalCode:
            String(formData.get("shippingPostalCode") ?? "").trim() || null,
          shippingNotes:
            String(formData.get("shippingNotes") ?? "").trim() || null,
          items: orderItems,
        }),
      });

      let result: OrderApiResponse = {};

      try {
        result = (await response.json()) as OrderApiResponse;
      } catch {
        // La réponse peut ne pas contenir de JSON en cas d'erreur serveur.
      }

      if (response.status === 401) {
        setNeedsSignIn(true);
        setErrorMessage(
          result.message ?? "Your session has expired. Please sign in again."
        );
        return;
      }

      // Mode test : aucune commande réelle n'est créée.
      if (
        response.ok &&
        result.success === true &&
        result.dryRun === true &&
        result.validation
      ) {
        setDryRunResult(result.validation);
        return;
      }

      const order = result.order;

      if (
        !response.ok ||
        result.success !== true ||
        !order ||
        typeof order.id !== "string" ||
        order.id.length === 0
      ) {
        setErrorMessage(
          result.message ??
            "We could not place your order. Please check your details and try again."
        );
        return;
      }

      // Le panier est vidé uniquement après la confirmation d'une vraie commande.
      setCreatedOrder(order);
      clearCart();
    } catch (error) {
      console.error("Checkout request failed:", error);
      setErrorMessage(
        "We could not contact the store. Your bag has been kept; please try again."
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-[#FBF8F4] px-6 py-20 text-center">
        <p className="text-sm text-stone-500">Loading your bag...</p>
      </main>
    );
  }

  if (dryRunResult) {
    return (
      <main className="min-h-screen bg-[#FBF8F4] px-5 py-12 text-[#3B2418] sm:px-10 sm:py-16">
        <div className="mx-auto max-w-2xl rounded-xl border border-[#E4D9CE] bg-white p-7 text-center sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6B55]">
            BaristaBar — Test mode
          </p>

          <div
            className="mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#F3EDE6] text-2xl text-[#3B2418]"
            aria-hidden="true"
          >
            ✓
          </div>

          <h1 className="mt-5 font-serif text-3xl sm:text-4xl">
            Checkout validation passed
          </h1>

          <p className="mt-3 text-sm leading-6 text-stone-600">
            This was a dry run only. No order was created and no stock was
            changed.
          </p>

          <div className="mt-7 rounded-lg bg-[#FBF8F4] p-5 text-left">
            <div className="flex justify-between gap-4 text-sm text-stone-600">
              <span>Items</span>
              <span>{dryRunResult.itemCount}</span>
            </div>

            <div className="mt-3 flex justify-between gap-4 text-sm text-stone-600">
              <span>Catalogue products checked</span>
              <span>{dryRunResult.productsChecked}</span>
            </div>

            <div className="mt-4 flex justify-between gap-4 text-sm text-stone-600">
              <span>Subtotal</span>
              <span>{formatMoney(dryRunResult.subtotal)}</span>
            </div>

            <div className="mt-3 flex justify-between gap-4 text-sm text-stone-600">
              <span>Delivery</span>
              <span>
                {Number(dryRunResult.deliveryFee) === 0
                  ? "Free"
                  : formatMoney(dryRunResult.deliveryFee)}
              </span>
            </div>

            <div className="mt-4 flex justify-between gap-4 border-t border-[#E4D9CE] pt-4">
              <span className="font-medium">Validated total</span>
              <span className="font-semibold">
                {formatMoney(dryRunResult.total)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDryRunResult(null)}
            className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-[#3B2418] px-6 py-3 text-sm font-semibold text-white hover:bg-[#604331]"
          >
            Back to checkout
          </button>

          <p className="mt-4 text-xs leading-5 text-stone-500">
            Disable test mode before accepting real orders.
          </p>
        </div>
      </main>
    );
  }

  if (createdOrder) {
    return (
      <main className="min-h-screen bg-[#FBF8F4] px-5 py-12 text-[#3B2418] sm:px-10 sm:py-16">
        <div className="mx-auto max-w-2xl rounded-xl border border-[#E4D9CE] bg-white p-7 text-center sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6B55]">
            BaristaBar
          </p>

          <div
            className="mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#F3EDE6] text-2xl text-[#3B2418]"
            aria-hidden="true"
          >
            ✓
          </div>

          <h1 className="mt-5 font-serif text-3xl sm:text-4xl">
            Thank you for your order
          </h1>

          <p className="mt-3 text-sm leading-6 text-stone-600">
            Your order has been received. Payment is due on delivery.
          </p>

          <div className="mt-7 rounded-lg bg-[#FBF8F4] p-5 text-left">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="text-sm text-stone-600">Order reference</span>
              <span className="break-all text-sm font-semibold">
                {createdOrder.id}
              </span>
            </div>

            <div className="mt-4 flex justify-between gap-4 text-sm text-stone-600">
              <span>Subtotal</span>
              <span>{formatMoney(createdOrder.subtotal)}</span>
            </div>

            <div className="mt-3 flex justify-between gap-4 text-sm text-stone-600">
              <span>Delivery</span>
              <span>{formatMoney(createdOrder.deliveryFee)}</span>
            </div>

            <div className="mt-4 flex justify-between gap-4 border-t border-[#E4D9CE] pt-4">
              <span className="font-medium">Total</span>
              <span className="font-semibold">
                {formatMoney(createdOrder.total)}
              </span>
            </div>
          </div>

          <Link
            href="/shop"
            className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-[#3B2418] px-6 py-3 text-sm font-semibold text-white hover:bg-[#604331]"
          >
            Continue shopping
          </Link>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-[#FBF8F4] px-6 py-20 text-center text-[#3B2418]">
        <h1 className="font-serif text-3xl">Your bag is empty</h1>

        <p className="mt-3 text-sm text-stone-600">
          Add products to your bag before continuing.
        </p>

        <Link
          href="/shop"
          className="mt-7 inline-flex rounded-full bg-[#3B2418] px-6 py-3 text-sm font-semibold text-white hover:bg-[#604331]"
        >
          Explore the shop
        </Link>
      </main>
    );
  }

  const townsForGovernorate = TUNISIAN_LOCATIONS[selectedGovernorate] ?? [];

  return (
    <main className="min-h-screen bg-[#FBF8F4] px-5 py-12 text-[#3B2418] sm:px-10 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/cart"
          className="text-sm font-medium text-[#8A6B55] hover:underline"
        >
          ← Back to bag
        </Link>

        <header className="mt-7 border-b border-[#E4D9CE] pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6B55]">
            BaristaBar
          </p>

          <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Checkout</h1>

          <p className="mt-4 text-sm text-stone-600">
            Signed in as <span className="font-medium">{userEmail}</span>
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]"
        >
          <div className="space-y-8">
            <section
              className="rounded-xl border border-[#E4D9CE] bg-white p-5 sm:p-6"
              aria-labelledby="delivery-heading"
            >
              <h2 id="delivery-heading" className="text-xl font-medium">
                Delivery details
              </h2>

              <p className="mt-2 text-sm leading-6 text-stone-600">
                Enter the details we need to deliver your order.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="customerName"
                    className="mb-2 block text-sm font-medium"
                  >
                    Full name <span aria-hidden="true">*</span>
                  </label>

                  <input
                    id="customerName"
                    name="customerName"
                    type="text"
                    autoComplete="name"
                    maxLength={150}
                    required
                    className="min-h-11 w-full rounded-md border border-[#D9CBBE] bg-white px-3 py-2 text-sm outline-none focus:border-[#8A6B55] focus:ring-2 focus:ring-[#8A6B55]/20"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="customerPhone"
                    className="mb-2 block text-sm font-medium"
                  >
                    GSM / Phone number <span aria-hidden="true">*</span>
                  </label>

                  <input
                    id="customerPhone"
                    name="customerPhone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    pattern="[0-9]{8}"
                    minLength={8}
                    maxLength={8}
                    title="Enter exactly 8 digits, numbers only."
                    aria-describedby="customerPhone-hint"
                    required
                    className="min-h-11 w-full rounded-md border border-[#D9CBBE] bg-white px-3 py-2 text-sm outline-none focus:border-[#8A6B55] focus:ring-2 focus:ring-[#8A6B55]/20"
                    placeholder="8 digits, e.g. 20123456"
                  />

                  <p
                    id="customerPhone-hint"
                    className="mt-1.5 text-xs text-stone-500"
                  >
                    Enter exactly 8 digits.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="shippingAddress"
                    className="mb-2 block text-sm font-medium"
                  >
                    Street address <span aria-hidden="true">*</span>
                  </label>

                  <input
                    id="shippingAddress"
                    name="shippingAddress"
                    type="text"
                    autoComplete="street-address"
                    maxLength={1000}
                    required
                    className="min-h-11 w-full rounded-md border border-[#D9CBBE] bg-white px-3 py-2 text-sm outline-none focus:border-[#8A6B55] focus:ring-2 focus:ring-[#8A6B55]/20"
                    placeholder="Street, building, apartment..."
                  />
                </div>

                <div>
                  <label
                    htmlFor="shippingGovernorate"
                    className="mb-2 block text-sm font-medium"
                  >
                    Governorate <span aria-hidden="true">*</span>
                  </label>

                  <select
                    id="shippingGovernorate"
                    name="shippingGovernorate"
                    value={selectedGovernorate}
                    onChange={(event) => {
                      setSelectedGovernorate(event.target.value);
                      setSelectedTown("");
                      setCustomTown("");
                    }}
                    required
                  >
                    <option value="">Choose a governorate</option>
                    {TUNISIAN_GOVERNORATES.map((governorate) => (
                      <option key={governorate} value={governorate}>
                        {governorate}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="shippingCityChoice"
                    className="mb-2 block text-sm font-medium"
                  >
                    Town / Delegation <span aria-hidden="true">*</span>
                  </label>
                  <select
                    id="shippingCityChoice"
                    value={selectedTown}
                    onChange={(event) => {
                      setSelectedTown(event.target.value);
                      setCustomTown("");
                    }}
                    disabled={!selectedGovernorate}
                    required
                  >
                    <option value="">Choose a town or delegation</option>
                    {townsForGovernorate.map((town) => (
                      <option key={town} value={town}>
                        {town}
                      </option>
                    ))}

                    <option value="__other__">Other locality...</option>
                  </select>

                  {selectedTown === OTHER_TOWN_OPTION ? (
                    <div className="mt-3">
                      <label
                        htmlFor="shippingCity"
                        className="mb-2 block text-sm font-medium"
                      >
                        Enter your town / locality{" "}
                        <span aria-hidden="true">*</span>
                      </label>

                      <input
                        id="shippingCity"
                        name="shippingCity"
                        type="text"
                        value={customTown}
                        onChange={(event) => setCustomTown(event.target.value)}
                        maxLength={120}
                        autoComplete="address-level2"
                        required
                        className="min-h-11 w-full rounded-md border border-[#D9CBBE] bg-white px-3 py-2 text-sm outline-none focus:border-[#8A6B55] focus:ring-2 focus:ring-[#8A6B55]/20"
                        placeholder="Enter your locality"
                      />
                    </div>
                  ) : (
                    <input
                      type="hidden"
                      name="shippingCity"
                      value={selectedTown}
                    />
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="shippingPostalCode"
                    className="mb-2 block text-sm font-medium"
                  >
                    Postal code{" "}
                    <span className="font-normal text-stone-500">
                      (optional)
                    </span>
                  </label>

                  <input
                    id="shippingPostalCode"
                    name="shippingPostalCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    title="Enter exactly 4 digits, numbers only."
                    aria-describedby="shippingPostalCode-hint"
                    className="min-h-11 w-full rounded-md border border-[#D9CBBE] bg-white px-3 py-2 text-sm outline-none focus:border-[#8A6B55] focus:ring-2 focus:ring-[#8A6B55]/20"
                    placeholder="4 digits, e.g. 5160"
                  />

                  <p
                    id="shippingPostalCode-hint"
                    className="mt-1.5 text-xs text-stone-500"
                  >
                    If provided, enter exactly 4 digits.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="shippingNotes"
                    className="mb-2 block text-sm font-medium"
                  >
                    Delivery notes{" "}
                    <span className="font-normal text-stone-500">
                      (optional)
                    </span>
                  </label>

                  <textarea
                    id="shippingNotes"
                    name="shippingNotes"
                    rows={3}
                    maxLength={2000}
                    className="w-full rounded-md border border-[#D9CBBE] bg-white px-3 py-2 text-sm outline-none focus:border-[#8A6B55] focus:ring-2 focus:ring-[#8A6B55]/20"
                    placeholder="Additional directions for the delivery driver"
                  />
                </div>
              </div>
            </section>

            <section aria-labelledby="items-heading" className="space-y-4">
              <h2 id="items-heading" className="text-xl font-medium">
                Review your order
              </h2>

              {items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-[#E4D9CE] bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium">{item.name}</h3>

                      {item.kind === "beanbox" && item.configurationLabel && (
                        <p className="mt-2 text-sm text-stone-500">
                          {item.configurationLabel}
                        </p>
                      )}

                      <p className="mt-2 text-sm text-stone-500">
                        Quantity: {item.quantity}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm font-semibold">
                      {formatMoney(item.price * item.quantity)}
                    </p>
                  </div>
                </article>
              ))}
            </section>
          </div>

          <aside className="h-fit rounded-xl bg-white p-6 ring-1 ring-[#E4D9CE]">
            <h2 className="text-xl font-medium">Order summary</h2>

            <div className="mt-5 flex justify-between gap-4 text-sm text-stone-600">
              <span>Items</span>
              <span>{itemCount}</span>
            </div>

            <div className="mt-4 flex justify-between gap-4 text-sm text-stone-600">
              <span>Subtotal estimate</span>
              <span>{formatMoney(subtotal)}</span>
            </div>

            <div className="mt-4 flex justify-between gap-4 border-t border-[#E4D9CE] pt-4 text-sm">
              <span className="font-medium">Delivery estimate</span>

              <span className="text-right font-semibold">
                {estimatedFreeDelivery ? "Free" : "Calculated by the store"}
              </span>
            </div>

            <p className="mt-3 text-xs leading-5 text-stone-500">
              Final prices, stock and delivery charges are checked by the store
              before your order is recorded.
            </p>

            <div className="mt-5 rounded-lg border border-[#E4D9CE] bg-[#FBF8F4] p-4">
              <p className="text-sm font-medium">Payment on delivery</p>

              <p className="mt-1 text-xs leading-5 text-stone-600">
                No online payment is taken at checkout. Pay when your order is
                delivered.
              </p>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                <p>{errorMessage}</p>

                {needsSignIn && (
                  <Link
                    href="/sign-in?next=%2Fcheckout"
                    className="mt-2 inline-block font-semibold underline"
                  >
                    Sign in again
                  </Link>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#3B2418] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#604331] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6B55] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Validating order..." : "Place order"}
            </button>

            <Link
              href="/cart"
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#3B2418] px-4 py-3 text-sm font-semibold text-[#3B2418] hover:bg-[#F8F5F0]"
            >
              Edit bag
            </Link>
          </aside>
        </form>
      </div>
    </main>
  );
}
