"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | string;
  category: string;
  image_url: string | null;
  stock: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
};

type ProductDraft = {
  name: string;
  slug: string;
  description: string;
  price: string;
  category: string;
  image_url: string;
  stock: string;
  is_active: boolean;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000"
).replace(/\/$/, "");

const EMPTY_DRAFT: ProductDraft = {
  name: "",
  slug: "",
  description: "",
  price: "0.000",
  category: "",
  image_url: "",
  stock: "0",
  is_active: true,
};

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatPrice(price: number | string): string {
  const amount = Number(price);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount);
}

async function authorizedFetch<T>(
  path: string,
  options: RequestInit = {},
  onAuthorizationFailure?: (status: 401 | 403) => void,
): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    onAuthorizationFailure?.(401);
    throw new Error("Ta session a expiré. Reconnecte-toi.");
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (response.status === 401) {
    onAuthorizationFailure?.(401);
    throw new Error("Ta session a expiré. Reconnecte-toi.");
  }

  if (response.status === 403) {
    onAuthorizationFailure?.(403);
    throw new Error("Ce compte n'est pas autorisé à gérer le catalogue.");
  }

  const result = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok || !result?.success) {
    throw new Error(result?.message ?? `Erreur API (${response.status}).`);
  }

  return result.data as T;
}

const fieldClassName =
  "mt-1.5 min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring";
const labelClassName = "block text-sm font-medium";
const secondaryButtonClassName =
  "inline-flex min-h-10 items-center justify-center rounded-lg border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60";
const primaryButtonClassName =
  "inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

export function ProductsManager() {
  const router = useRouter();
  const handleAuthorizationFailure = useCallback(
    (status: 401 | 403) => {
      router.replace(status === 401 ? "/login" : "/unauthorized");
      router.refresh();
    },
    [router],
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [slugWasEdited, setSlugWasEdited] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadProducts = useCallback(async () => {
    try {
      const data = await authorizedFetch<Product[]>(
        "/api/admin/products",
        {},
        handleAuthorizationFailure,
      );
      setProducts(data);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger le catalogue.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [handleAuthorizationFailure]);

  // Load the catalogue after the component mounts. Deferring the request to a
  // timer keeps state updates out of the synchronous effect body and lets
  // React cancel the pending initial request during cleanup.
  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadProducts();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;

    return products.filter((product) =>
      [product.name, product.slug, product.category]
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [products, search]);

  function updateDraft<K extends keyof ProductDraft>(
    key: K,
    value: ProductDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleNameChange(value: string) {
    setDraft((current) => ({
      ...current,
      name: value,
      slug: slugWasEdited ? current.slug : slugify(value),
    }));
  }

  function resetForm() {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setSlugWasEdited(false);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setSlugWasEdited(true);
    setErrorMessage("");
    setSuccessMessage("");
    setDraft({
      name: product.name,
      slug: product.slug,
      description: product.description ?? "",
      price: Number(product.price).toFixed(3),
      category: product.category,
      image_url: product.image_url ?? "",
      stock: String(product.stock),
      is_active: product.is_active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const price = Number(draft.price);
    const stock = Number(draft.stock);
    if (!Number.isFinite(price) || price < 0 || !/^\d+(\.\d{1,3})?$/.test(draft.price)) {
      setErrorMessage("Saisis un prix positif ou nul avec au maximum 3 décimales.");
      setIsSaving(false);
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      setErrorMessage("Le stock doit être un nombre entier positif ou nul.");
      setIsSaving(false);
      return;
    }

    const payload = {
      name: draft.name.trim(),
      slug: draft.slug.trim(),
      description: draft.description.trim() || null,
      price,
      category: draft.category.trim(),
      image_url: draft.image_url.trim() || null,
      stock,
      is_active: draft.is_active,
    };

    try {
      await authorizedFetch<Product>(
        editingId ? `/api/admin/products/${encodeURIComponent(editingId)}` : "/api/admin/products",
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
        handleAuthorizationFailure,
      );
      setSuccessMessage(editingId ? "Produit mis à jour." : "Produit ajouté au catalogue.");
      setDraft(EMPTY_DRAFT);
      setEditingId(null);
      setSlugWasEdited(false);
      await loadProducts();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Impossible d'enregistrer le produit.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleProduct(product: Product) {
    const action = product.is_active ? "désactiver" : "réactiver";
    if (!window.confirm(`Veux-tu ${action} « ${product.name} » ?`)) return;

    setBusyProductId(product.id);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await authorizedFetch<Product>(
        `/api/admin/products/${encodeURIComponent(product.id)}/active`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_active: !product.is_active }),
        },
        handleAuthorizationFailure,
      );
      setSuccessMessage(product.is_active ? "Produit désactivé." : "Produit réactivé.");
      await loadProducts();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Impossible de modifier le statut.",
      );
    } finally {
      setBusyProductId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline">
          ← Retour au tableau de bord
        </Link>
        <button
          type="button"
          className={secondaryButtonClassName}
          onClick={() => {
            setIsLoading(true);
            void loadProducts();
          }}
          disabled={isLoading}
        >
          {isLoading ? "Actualisation…" : "Actualiser le catalogue"}
        </button>
      </div>

      {(errorMessage || successMessage) && (
        <div
          role={errorMessage ? "alert" : "status"}
          className={`rounded-lg border p-4 text-sm ${
            errorMessage
              ? "border-red-300 bg-red-50 text-red-800"
              : "border-emerald-300 bg-emerald-50 text-emerald-800"
          }`}
        >
          {errorMessage || successMessage}
        </div>
      )}

      <section className="rounded-xl border bg-background p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">
            {editingId ? "Modifier un produit" : "Ajouter un produit"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Les changements sont enregistrés dans le catalogue Supabase via le backend sécurisé.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="product-name">Nom du produit *</label>
              <input id="product-name" className={fieldClassName} value={draft.name} onChange={(event) => handleNameChange(event.target.value)} maxLength={160} required />
            </div>
            <div>
              <label className={labelClassName} htmlFor="product-slug">Slug URL *</label>
              <input id="product-slug" className={fieldClassName} value={draft.slug} onChange={(event) => { setSlugWasEdited(true); updateDraft("slug", slugify(event.target.value)); }} maxLength={160} pattern="[a-z0-9]+(-[a-z0-9]+)*" required />
              <p className="mt-1 text-xs text-muted-foreground">Exemple : house-espresso-blend</p>
            </div>
            <div>
              <label className={labelClassName} htmlFor="product-category">Catégorie *</label>
              <input id="product-category" className={fieldClassName} value={draft.category} onChange={(event) => updateDraft("category", event.target.value)} maxLength={100} required />
            </div>
            <div>
              <label className={labelClassName} htmlFor="product-price">Prix (TND) *</label>
              <input id="product-price" className={fieldClassName} type="number" inputMode="decimal" min="0" max="9999999.999" step="0.001" value={draft.price} onChange={(event) => updateDraft("price", event.target.value)} required />
            </div>
            <div>
              <label className={labelClassName} htmlFor="product-stock">Stock *</label>
              <input id="product-stock" className={fieldClassName} type="number" min="0" step="1" value={draft.stock} onChange={(event) => updateDraft("stock", event.target.value)} required />
            </div>
            <div>
              <label className={labelClassName} htmlFor="product-image">URL ou chemin de l’image</label>
              <input id="product-image" className={fieldClassName} type="text" placeholder="/coffee-image.jpg ou https://…" value={draft.image_url} onChange={(event) => updateDraft("image_url", event.target.value)} maxLength={2048} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClassName} htmlFor="product-description">Description</label>
              <textarea id="product-description" className={`${fieldClassName} min-h-28 resize-y`} value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} maxLength={5000} rows={4} />
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-primary" checked={draft.is_active} onChange={(event) => updateDraft("is_active", event.target.checked)} />
            Produit actif et visible dans la boutique
          </label>

          <div className="flex flex-wrap gap-3">
            <button type="submit" className={primaryButtonClassName} disabled={isSaving}>
              {isSaving ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Ajouter le produit"}
            </button>
            {editingId && (
              <button type="button" className={secondaryButtonClassName} onClick={resetForm} disabled={isSaving}>
                Annuler la modification
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border bg-background">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Tous les produits</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {products.length} produit{products.length === 1 ? "" : "s"}, actifs et désactivés.
            </p>
          </div>
          <input
            aria-label="Rechercher un produit"
            className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-xs"
            placeholder="Rechercher nom, slug, catégorie…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Chargement du catalogue…</p>
        ) : filteredProducts.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            {products.length === 0 ? "Aucun produit trouvé." : "Aucun produit ne correspond à cette recherche."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-212.5 text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Produit</th>
                  <th className="px-4 py-3 font-medium">Catégorie</th>
                  <th className="px-4 py-3 font-medium">Prix</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="align-top">
                    <td className="px-4 py-4">
                      <p className="font-medium">{product.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{product.slug}</p>
                    </td>
                    <td className="px-4 py-4">{product.category}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-medium">{formatPrice(product.price)}</td>
                    <td className={`px-4 py-4 font-medium ${product.stock === 0 ? "text-red-600" : ""}`}>{product.stock}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${product.is_active ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-600"}`}>
                        {product.is_active ? "Actif" : "Désactivé"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className={secondaryButtonClassName} onClick={() => startEdit(product)}>
                          Modifier
                        </button>
                        <button type="button" className={secondaryButtonClassName} onClick={() => void toggleProduct(product)} disabled={busyProductId === product.id}>
                          {busyProductId === product.id ? "…" : product.is_active ? "Désactiver" : "Réactiver"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
