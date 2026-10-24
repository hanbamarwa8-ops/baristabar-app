"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import {
  useCart,
  type CartBoxContent,
  type CartBoxProduct,
} from "@/components/providers/CartProvider";

export type BeanBoxMode =
  | "discovery"
  | "classic"
  | "barista"
  | "premium";

export interface BeanBoxOptionProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  price: number;
  image: string;
  stock: number;
}

interface BeanBoxCustomizerProps {
  boxSlug: string;
  boxName: string;
  boxDescription: string;
  boxImage: string;
  mode: BeanBoxMode;
  products: BeanBoxOptionProduct[];
  catalogueError: boolean;
}

const FEATURED_SLUGS = [
  "ethiopia-yirgacheffe",
  "house-espresso-blend",
  "colombia-supremo",
];

function formatPrice(price: number): string {
  return `${price.toFixed(3)} DT`;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isAccessory(product: BeanBoxOptionProduct): boolean {
  return normalize(product.category).includes("accessor");
}

function isFlavour(product: BeanBoxOptionProduct): boolean {
  const category = normalize(product.category);

  return (
    category.includes("syrup") ||
    category.includes("flavour") ||
    category.includes("flavor")
  );
}

interface ProductSelectProps {
  id: string;
  label: string;
  products: BeanBoxOptionProduct[];
  value: string;
  onChange: (value: string) => void;
}

function ProductSelect({
  id,
  label,
  products,
  value,
  onChange,
}: ProductSelectProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-[#3B2418]"
      >
        {label}
      </label>

      <select
        id={id}
        value={value}
        disabled={products.length === 0}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[5px] border border-[#E5D9CD] bg-white px-4 py-3 text-sm text-[#3B2418] outline-none transition-colors focus:border-[#8A6B55] disabled:cursor-not-allowed disabled:bg-stone-100"
      >
        {products.length === 0 ? (
          <option value="">No eligible product in stock</option>
        ) : (
          products.map((product) => (
            <option key={product.slug} value={product.slug}>
              {product.name} — {formatPrice(product.price)}
            </option>
          ))
        )}
      </select>

      {products.length === 0 && (
        <p className="mt-2 text-xs leading-5 text-stone-500">
          No eligible products are currently available for this choice.
        </p>
      )}
    </div>
  );
}

export function BeanBoxCustomizer({
  boxSlug,
  boxName,
  boxDescription,
  boxImage,
  mode,
  products,
  catalogueError,
}: BeanBoxCustomizerProps) {
  const { addBoxToCart } = useCart();

  const featuredProducts = FEATURED_SLUGS
    .map((slug) => products.find((product) => product.slug === slug))
    .filter(
      (product): product is BeanBoxOptionProduct =>
        product !== undefined,
    );

  const availableFeatured = featuredProducts.filter(
    (product) => product.stock > 0,
  );

  const accessoryProducts = products.filter(
    (product) => product.stock > 0 && isAccessory(product),
  );

  const premiumAddons = products.filter(
    (product) =>
      product.stock > 0 &&
      (isAccessory(product) || isFlavour(product)),
  );

  const [coffeeSlug, setCoffeeSlug] = useState(
    () =>
      FEATURED_SLUGS.find((slug) =>
        products.some(
          (product) => product.slug === slug && product.stock > 0,
        ),
      ) ?? "",
  );

  const [secondCoffeeSlug, setSecondCoffeeSlug] = useState(() => {
    const firstAvailable = FEATURED_SLUGS.find((slug) =>
      products.some(
        (product) => product.slug === slug && product.stock > 0,
      ),
    );

    return (
      FEATURED_SLUGS.find(
        (slug) =>
          slug !== firstAvailable &&
          products.some(
            (product) => product.slug === slug && product.stock > 0,
          ),
      ) ?? ""
    );
  });

  const [addonSlug, setAddonSlug] = useState(
    () =>
      products.find(
        (product) =>
          product.stock > 0 && isAccessory(product),
      )?.slug ??
      products.find(
        (product) =>
          product.stock > 0 &&
          (isAccessory(product) || isFlavour(product)),
      )?.slug ??
      "",
  );

  const [added, setAdded] = useState(false);

  const selectedCoffee =
    availableFeatured.find((product) => product.slug === coffeeSlug) ??
    availableFeatured[0];

  const secondCoffeeOptions = availableFeatured.filter(
    (product) => product.slug !== selectedCoffee?.slug,
  );

  const selectedSecondCoffee =
    secondCoffeeOptions.find(
      (product) => product.slug === secondCoffeeSlug,
    ) ?? secondCoffeeOptions[0];

  const currentAddonOptions =
    mode === "premium" ? premiumAddons : accessoryProducts;

  const selectedAddon =
    currentAddonOptions.find(
      (product) => product.slug === addonSlug,
    ) ?? currentAddonOptions[0];

  let selectedProducts: BeanBoxOptionProduct[] = [];

  switch (mode) {
    case "discovery":
      selectedProducts = featuredProducts;
      break;

    case "classic":
      selectedProducts = selectedCoffee ? [selectedCoffee] : [];
      break;

    case "barista":
      selectedProducts = [
        ...(selectedCoffee ? [selectedCoffee] : []),
        ...(selectedAddon ? [selectedAddon] : []),
      ];
      break;

    case "premium":
      selectedProducts = [
        ...(selectedCoffee ? [selectedCoffee] : []),
        ...(selectedSecondCoffee ? [selectedSecondCoffee] : []),
        ...(selectedAddon ? [selectedAddon] : []),
      ];
      break;
  }

  const expectedProductCount =
    mode === "discovery" ? 3 : mode === "classic" ? 1 : mode === "barista" ? 2 : 3;

  const selectionComplete =
    selectedProducts.length === expectedProductCount &&
    (mode !== "discovery" || featuredProducts.length === 3);

  const stockLimit =
    selectedProducts.length > 0
      ? Math.min(...selectedProducts.map((product) => product.stock))
      : 0;

  const boxPrice = Number(
    selectedProducts
      .reduce((total, product) => total + product.price, 0)
      .toFixed(3),
  );

  const canAdd =
    !catalogueError &&
    selectionComplete &&
    selectedProducts.every((product) => product.stock > 0) &&
    Number.isFinite(boxPrice) &&
    boxPrice >= 0 &&
    stockLimit > 0;

  const contents: CartBoxContent[] = selectedProducts.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    quantityPerBox: 1,
    unitPrice: product.price,
    image: product.image,
  }));

  const configurationLabel =
    selectedProducts.length > 0
      ? selectedProducts.map((product) => product.name).join(" + ")
      : "Incomplete selection";

  function handleAddToCart() {
    if (!canAdd) return;

    const box: CartBoxProduct = {
      id: `beanbox:${boxSlug}:${selectedProducts
        .map((product) => product.slug)
        .join("+")}`,
      name: boxName,
      category: "BeanBox",
      description: boxDescription,
      price: boxPrice,
      image: boxImage,
      stock: stockLimit,
      kind: "beanbox",
      boxSlug,
      configurationLabel,
      contents,
    };

    addBoxToCart(box);
    setAdded(true);
  }

  function changeCoffee(value: string) {
    setCoffeeSlug(value);
    setAdded(false);
  }

  function changeSecondCoffee(value: string) {
    setSecondCoffeeSlug(value);
    setAdded(false);
  }

  function changeAddon(value: string) {
    setAddonSlug(value);
    setAdded(false);
  }

  return (
    <section className="px-6 pb-16 sm:px-10 sm:pb-20 lg:px-16">
      <div className="mx-auto max-w-310">
        <header className="border-b border-[#E8DFD5] pb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8A6B55] sm:text-xs">
            Personalise your BeanBox
          </p>

          <h2 className="mt-3 font-serif text-3xl text-[#3B2418] sm:text-4xl">
            Build your box.
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
            Choose the contents that suit your coffee ritual. Your
            selection and its total price will be shown together before
            you add the complete box to your bag.
          </p>
        </header>

        {catalogueError ? (
          <p role="alert" className="py-12 text-sm text-stone-500">
            The catalogue is temporarily unavailable. Please try again
            when product availability can be checked.
          </p>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
            <div className="space-y-7">
              {mode === "discovery" && (
                <div>
                  <h3 className="font-serif text-xl text-[#3B2418]">
                    Your three Featured coffees
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-stone-500">
                    Discovery comes with a fixed selection of the three
                    signature coffees. No extra choices are required.
                  </p>
                </div>
              )}

              {mode === "classic" && (
                <ProductSelect
                  id="classic-coffee"
                  label="Choose your Featured coffee"
                  products={availableFeatured}
                  value={selectedCoffee?.slug ?? ""}
                  onChange={changeCoffee}
                />
              )}

              {mode === "barista" && (
                <div className="space-y-6">
                  <ProductSelect
                    id="barista-coffee"
                    label="1. Choose your Featured coffee"
                    products={availableFeatured}
                    value={selectedCoffee?.slug ?? ""}
                    onChange={changeCoffee}
                  />

                  <ProductSelect
                    id="barista-accessory"
                    label="2. Choose an available coffee accessory"
                    products={accessoryProducts}
                    value={selectedAddon?.slug ?? ""}
                    onChange={changeAddon}
                  />
                </div>
              )}

              {mode === "premium" && (
                <div className="space-y-6">
                  <ProductSelect
                    id="premium-coffee-one"
                    label="1. Choose your first Featured coffee"
                    products={availableFeatured}
                    value={selectedCoffee?.slug ?? ""}
                    onChange={changeCoffee}
                  />

                  <ProductSelect
                    id="premium-coffee-two"
                    label="2. Choose a different Featured coffee"
                    products={secondCoffeeOptions}
                    value={selectedSecondCoffee?.slug ?? ""}
                    onChange={changeSecondCoffee}
                  />

                  <ProductSelect
                    id="premium-addon"
                    label="3. Choose an available accessory or flavour"
                    products={premiumAddons}
                    value={selectedAddon?.slug ?? ""}
                    onChange={changeAddon}
                  />
                </div>
              )}

              <div>
                <h3 className="font-serif text-xl text-[#3B2418]">
                  Included in your box
                </h3>

                {selectedProducts.length > 0 ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {selectedProducts.map((product) => (
                      <article
                        key={product.slug}
                        className="flex gap-3 rounded-[8px] border border-[#E5D9CD] bg-white p-3"
                      >
                        <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-[5px] bg-[#EDE2D5]">
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A6B55]">
                            {product.category}
                          </p>

                          <h4 className="mt-1 text-sm font-medium text-[#3B2418]">
                            {product.name}
                          </h4>

                          <p className="mt-2 text-xs text-stone-500">
                            {formatPrice(product.price)}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-stone-500">
                    No eligible products are currently available.
                  </p>
                )}
              </div>
            </div>

            <aside className="rounded-xl bg-[#F8F5F0] p-6 sm:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A6B55]">
                Your complete box
              </p>

              <h3 className="mt-3 font-serif text-2xl text-[#3B2418]">
                {boxName}
              </h3>

              <div className="my-5 h-px bg-[#E5D9CD]" />

              <div className="flex justify-between gap-3 text-sm text-stone-600">
                <span>Included products</span>
                <span>{selectedProducts.length}</span>
              </div>

              <div className="mt-4 flex justify-between gap-3 text-sm text-stone-600">
                <span>Purchase type</span>
                <span>One-time</span>
              </div>

              <div className="mt-5 border-t border-[#E5D9CD] pt-5">
                <p className="text-sm text-stone-600">Box total</p>

                <p className="mt-2 font-serif text-3xl text-[#3B2418]">
                  {formatPrice(boxPrice)}
                </p>
              </div>

              <p className="mt-4 text-xs leading-5 text-stone-500">
              Free delivery is available with a BeanBox and at least one other
              product, or on orders over 200 DT.
              </p>

              {!selectionComplete && (
                <p className="mt-4 text-xs leading-5 text-amber-800">
                  This box cannot be completed with the currently
                  available selection.
                </p>
              )}

              {selectionComplete && stockLimit === 0 && (
                <p className="mt-4 text-xs leading-5 text-amber-800">
                  At least one included product is out of stock.
                </p>
              )}

              {selectionComplete && stockLimit > 0 && (
                <p className="mt-4 text-xs leading-5 text-stone-500">
                  Available to build: {stockLimit}{" "}
                  {stockLimit === 1 ? "box" : "boxes"}, based on current
                  product stock.
                </p>
              )}

              <button
                type="button"
                disabled={!canAdd}
                onClick={handleAddToCart}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[5px] bg-[#3B2418] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#604331] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6B55] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {!selectionComplete
                  ? "Selection unavailable"
                  : stockLimit <= 0
                    ? "Currently unavailable"
                    : "Add complete box to bag"}
                <span aria-hidden="true">→</span>
              </button>

              {added && (
                <p
                  role="status"
                  className="mt-4 text-sm leading-6 text-[#604331]"
                >
                  Your complete box has been added.
                  {" "}
                  <Link
                    href="/cart"
                    className="font-semibold underline underline-offset-4"
                  >
                    View your bag
                  </Link>
                </p>
              )}
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
