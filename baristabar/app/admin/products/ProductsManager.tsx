"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ImagePlus,
  Loader2,
  Package,
  Pencil,
  Power,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  is_active?: boolean;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | string;
  category: string;
  category_id?: string | null;
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
  category_id: string;
  image_url: string;
  stock: string;
  is_active: boolean;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

type UploadedImage = {
  path: string;
  publicUrl: string;
  contentType: string;
  size: number;
};

type DeletedProduct = {
  id: string;
  image_url: string | null;
};

type DeletedImage = {
  path: string;
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

const EMPTY_DRAFT: ProductDraft = {
  name: "",
  slug: "",
  description: "",
  price: "0.000",
  category_id: "",
  image_url: "",
  stock: "0",
  is_active: true,
};

const fieldClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-[#E8DED4] bg-[#FBF8F4] px-4 py-3 text-sm text-[#3B2418] outline-none transition placeholder:text-[#A08D7E] focus:border-[#8A6B55] focus:ring-2 focus:ring-[#8A6B55]/15 disabled:cursor-not-allowed disabled:opacity-60";

const labelClassName =
  "block text-xs font-semibold uppercase tracking-[0.08em] text-[#795A46]";

const primaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#3B2418] px-5 py-2.5 text-sm font-semibold text-[#FBF8F4] shadow-sm transition-all hover:bg-[#684733] disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButtonClassName =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#3B2418]/15 bg-white px-4 py-2 text-sm font-medium text-[#665044] transition-colors hover:border-[#795A46]/40 hover:bg-[#FBF8F4] hover:text-[#3B2418] disabled:cursor-not-allowed disabled:opacity-50";

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

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount);
}

function isManagedProductImage(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const pathPattern =
    /^products\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|avif)$/i;

  if (pathPattern.test(value)) {
    return true;
  }

  try {
    const url = new URL(value);
    const prefix = "/storage/v1/object/public/product-images/";

    if (!url.pathname.startsWith(prefix)) {
      return false;
    }

    const path = decodeURIComponent(url.pathname.slice(prefix.length));

    return pathPattern.test(path);
  } catch {
    return false;
  }
}

async function authorizedFetch<T>(
  path: string,
  options: RequestInit = {},
  onAuthorizationFailure?: (status: 401 | 403) => void
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

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (options.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
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

  const result = (await response
    .json()
    .catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !result?.success) {
    throw new Error(result?.message ?? `Erreur API (${response.status}).`);
  }

  return result.data as T;
}

export function ProductsManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAuthorizationFailure = useCallback(
    (status: 401 | 403) => {
      router.replace(status === 401 ? "/admin/login" : "/admin/unauthorized");

      router.refresh();
    },
    [router]
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [draft, setDraft] = useState<ProductDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [slugWasEdited, setSlugWasEdited] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<UploadedImage | null>(null);

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  const [search, setSearch] = useState("");

  // Le filtre est synchronisé avec ?category=<id> pour permettre
  // l'accès direct depuis la page de gestion des catégories.
  const requestedCategoryId = searchParams.get("category");
  const categoryFilter =
    requestedCategoryId &&
    categories.some((category) => category.id === requestedCategoryId)
      ? requestedCategoryId
      : "all";
  const selectedCategory =
    categories.find((category) => category.id === categoryFilter) ?? null;

  const [isLoading, setIsLoading] = useState(true);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Libérer les URL temporaires utilisées pour l'aperçu local.
  useEffect(() => {
    if (!imagePreview?.startsWith("blob:")) {
      return;
    }

    return () => {
      URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const loadProducts = useCallback(async () => {
    try {
      const data = await authorizedFetch<Product[]>(
        "/api/admin/products",
        {},
        handleAuthorizationFailure
      );

      setProducts(data);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger le catalogue."
      );
    } finally {
      setIsLoading(false);
    }
  }, [handleAuthorizationFailure]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await authorizedFetch<Category[]>(
        "/api/admin/categories",
        {},
        handleAuthorizationFailure
      );

      setCategories(data);
      setCategoryError("");
    } catch (error) {
      setCategoryError(
        error instanceof Error
          ? error.message
          : "Impossible de charger les catégories."
      );
    } finally {
      setIsCategoriesLoading(false);
    }
  }, [handleAuthorizationFailure]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadProducts();
      void loadCategories();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadProducts, loadCategories]);

  // Les statistiques et la liste sont calculées dans le périmètre de la
  // catégorie sélectionnée. La recherche ne modifie pas les statistiques.
  const categoryProducts = useMemo(() => {
    if (categoryFilter === "all" || !selectedCategory) {
      return products;
    }

    return products.filter(
      (product) =>
        product.category_id === selectedCategory.id ||
        product.category === selectedCategory.name
    );
  }, [products, categoryFilter, selectedCategory]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return categoryProducts;
    }

    return categoryProducts.filter((product) =>
      [product.name, product.slug, product.category].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [categoryProducts, search]);

  function handleCategoryFilterChange(value: string) {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (value === "all") {
      nextParams.delete("category");
    } else {
      nextParams.set("category", value);
    }

    const query = nextParams.toString();

    router.replace(query ? `/admin/products?${query}` : "/admin/products", {
      scroll: false,
    });
  }

  const activeProducts = useMemo(
    () => categoryProducts.filter((product) => product.is_active).length,
    [categoryProducts]
  );

  const inactiveProducts = categoryProducts.length - activeProducts;

  const availableCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.is_active !== false ||
          category.id === draft.category_id ||
          category.id === categoryFilter
      ),
    [categories, draft.category_id, categoryFilter]
  );

  function updateDraft<K extends keyof ProductDraft>(
    key: K,
    value: ProductDraft[K]
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleNameChange(value: string) {
    setDraft((current) => ({
      ...current,
      name: value,
      slug: slugWasEdited ? current.slug : slugify(value),
    }));
  }

  async function uploadProductImage(file: File): Promise<UploadedImage> {
    const formData = new FormData();
    formData.append("file", file);

    return authorizedFetch<UploadedImage>(
      "/api/admin/products/upload",
      {
        method: "POST",
        body: formData,
      },
      handleAuthorizationFailure
    );
  }

  async function deleteProductImage(imagePath: string): Promise<void> {
    await authorizedFetch<DeletedImage>(
      "/api/admin/products/image",
      {
        method: "DELETE",
        body: JSON.stringify({
          path: imagePath,
        }),
      },
      handleAuthorizationFailure
    );
  }

  async function cleanupImageSafely(imageUrl: string | null): Promise<boolean> {
    if (!imageUrl || !isManagedProductImage(imageUrl)) {
      return true;
    }

    try {
      await deleteProductImage(imageUrl);
      return true;
    } catch (error) {
      console.error("Product image cleanup failed:", error);

      return false;
    }
  }

  function discardPendingImage() {
    const temporaryImage = pendingImage;

    setPendingImage(null);

    if (temporaryImage) {
      void deleteProductImage(temporaryImage.path).catch((error) => {
        console.error("Impossible de nettoyer la photo temporaire :", error);
      });
    }
  }

  // Upload immédiat dès que l'administrateur sélectionne ou dépose une photo.
  async function handleImageFile(file: File) {
    if (isUploadingImage || isSaving) {
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setErrorMessage("Format non accepté. Utilise JPEG, PNG, WebP ou AVIF.");

      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setErrorMessage("La photo ne doit pas dépasser 5 Mo.");

      return;
    }

    const previousPreview = imagePreview;
    const previousPendingImage = pendingImage;

    const localPreview = URL.createObjectURL(file);

    setImagePreview(localPreview);
    setIsUploadingImage(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const uploadedImage = await uploadProductImage(file);

      setPendingImage(uploadedImage);
      setImagePreview(uploadedImage.publicUrl);

      setDraft((current) => ({
        ...current,
        image_url: uploadedImage.publicUrl,
      }));

      let message = "Photo importée avec succès.";

      if (previousPendingImage) {
        const cleanupSucceeded = await cleanupImageSafely(
          previousPendingImage.path
        );

        if (!cleanupSucceeded) {
          message +=
            " Attention : une ancienne photo temporaire n'a pas pu être supprimée.";
        }
      }

      setSuccessMessage(message);
    } catch (error) {
      setImagePreview(previousPreview);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'importer cette photo."
      );
    } finally {
      setIsUploadingImage(false);
    }
  }

  function handleImageInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      void handleImageFile(file);
    }

    event.target.value = "";
  }

  async function removeImage() {
    const temporaryImage = pendingImage;

    setPendingImage(null);
    setImagePreview(null);

    setDraft((current) => ({
      ...current,
      image_url: "",
    }));

    setErrorMessage("");
    setSuccessMessage("");

    // L'ancienne photo enregistrée est conservée jusqu'à la sauvegarde.
    if (temporaryImage) {
      try {
        await deleteProductImage(temporaryImage.path);
      } catch (error) {
        console.error("Erreur de suppression de la photo temporaire :", error);

        setErrorMessage(
          "La photo a été retirée du formulaire, mais sa suppression dans Storage a échoué."
        );
      }
    }
  }

  function resetForm() {
    discardPendingImage();

    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setSlugWasEdited(false);
    setImagePreview(null);

    setErrorMessage("");
    setSuccessMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function startEdit(product: Product) {
    discardPendingImage();

    const matchingCategory =
      categories.find((category) => category.id === product.category_id) ??
      categories.find((category) => category.name === product.category);

    setEditingId(product.id);
    setSlugWasEdited(true);

    setErrorMessage("");
    setCategoryError("");
    setSuccessMessage("");

    setDraft({
      name: product.name,
      slug: product.slug,
      description: product.description ?? "",
      price: Number(product.price).toFixed(3),
      category_id: product.category_id ?? matchingCategory?.id ?? "",
      image_url: product.image_url ?? "",
      stock: String(product.stock),
      is_active: product.is_active,
    });

    setImagePreview(product.image_url ?? null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const selectedCategoryId =
      draft.category_id ||
      (!editingId && categoryFilter !== "all" ? categoryFilter : "");
    const selectedCategory = categories.find(
      (category) => category.id === selectedCategoryId
    );

    if (!selectedCategory) {
      setErrorMessage("Sélectionne une catégorie valide pour ce produit.");

      return;
    }

    const price = Number(draft.price);
    const stock = Number(draft.stock);

    if (
      !Number.isFinite(price) ||
      price < 0 ||
      !/^\d+(\.\d{1,3})?$/.test(draft.price)
    ) {
      setErrorMessage(
        "Saisis un prix positif ou nul avec au maximum 3 décimales."
      );

      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setErrorMessage("Le stock doit être un nombre entier positif ou nul.");

      return;
    }

    if (!draft.name.trim() || !draft.slug.trim()) {
      setErrorMessage("Le nom et le slug du produit sont obligatoires.");

      return;
    }

    if (isUploadingImage) {
      setErrorMessage("Attends la fin de l'importation de la photo.");

      return;
    }

    setIsSaving(true);

    const previousProduct = products.find(
      (product) => product.id === editingId
    );

    const previousImageUrl = previousProduct?.image_url ?? null;

    const newImageUrl = draft.image_url.trim() || null;

    try {
      const payload = {
        name: draft.name.trim(),
        slug: draft.slug.trim(),
        description: draft.description.trim() || null,
        price,
        category_id: selectedCategory.id,
        category: selectedCategory.name,
        image_url: newImageUrl,
        stock,
        is_active: draft.is_active,
      };

      await authorizedFetch<Product>(
        editingId
          ? `/api/admin/products/${encodeURIComponent(editingId)}`
          : "/api/admin/products",
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
        handleAuthorizationFailure
      );

      const wasEditing = Boolean(editingId);
      const imageChanged = previousImageUrl !== newImageUrl;

      // L'image temporaire est maintenant associée au produit.
      setPendingImage(null);

      setDraft(EMPTY_DRAFT);
      setEditingId(null);
      setSlugWasEdited(false);
      setImagePreview(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      let message = wasEditing
        ? "Produit mis à jour avec succès."
        : "Produit ajouté au catalogue avec succès.";

      // Nettoyer l'ancienne image uniquement après la réussite de la mise à jour.
      if (wasEditing && imageChanged && previousImageUrl) {
        const cleanupSucceeded = await cleanupImageSafely(previousImageUrl);

        if (!cleanupSucceeded) {
          message +=
            " Attention : l'ancienne photo n'a pas pu être supprimée de Storage.";
        }
      }

      setSuccessMessage(message);

      await loadProducts();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer le produit."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleProduct(product: Product) {
    const action = product.is_active ? "deactivate" : "reactivate";

    if (!window.confirm(`Do you want to ${action} "${product.name}"?`)) {
      return;
    }

    setBusyProductId(product.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await authorizedFetch<Product>(
        `/api/admin/products/${encodeURIComponent(product.id)}/active`,
        {
          method: "PATCH",
          body: JSON.stringify({
            is_active: !product.is_active,
          }),
        },
        handleAuthorizationFailure
      );

      setSuccessMessage(
        product.is_active ? "Produit désactivé." : "Produit réactivé."
      );

      await loadProducts();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de modifier le statut."
      );
    } finally {
      setBusyProductId(null);
    }
  }

  async function removeProduct(product: Product) {
    const confirmed = window.confirm(
      `Supprimer définitivement « ${product.name} » ?\n\n` +
        "Cette opération est irréversible. " +
        "Un produit déjà utilisé dans une commande ne pourra pas être supprimé."
    );

    if (!confirmed) {
      return;
    }

    setBusyProductId(product.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const deleted = await authorizedFetch<DeletedProduct>(
        `/api/admin/products/${encodeURIComponent(product.id)}`,
        {
          method: "DELETE",
        },
        handleAuthorizationFailure
      );

      let message = "Produit supprimé du catalogue.";

      if (deleted.image_url) {
        const cleanupSucceeded = await cleanupImageSafely(deleted.image_url);

        if (!cleanupSucceeded) {
          message +=
            " Attention : la photo est toujours présente dans Storage.";
        }
      }

      if (editingId === product.id) {
        discardPendingImage();

        setDraft(EMPTY_DRAFT);
        setEditingId(null);
        setSlugWasEdited(false);
        setImagePreview(null);
      }

      setSuccessMessage(message);

      await loadProducts();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer ce produit."
      );
    } finally {
      setBusyProductId(null);
    }
  }

  async function refreshCatalog() {
    setIsLoading(true);
    setIsCategoriesLoading(true);

    await Promise.all([loadProducts(), loadCategories()]);
  }

  return (
    <div className="space-y-8 text-[#3B2418]">
      {/* En-tête de la page */}
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A8577]">
              {selectedCategory
                ? `BARISTABAR / CATALOGUE / ${selectedCategory.slug.toUpperCase()}`
                : "BARISTABAR / CATALOGUE"}
            </p>

            <h1
              className="mt-1 text-4xl font-medium tracking-tight text-[#3B2418] sm:text-5xl"
              style={{ fontFamily: "var(--font-brand)" }}
            >
              {selectedCategory ? selectedCategory.name : "Nos produits"}
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#795A46]">
              {selectedCategory
                ? selectedCategory.description?.trim() ||
                  `Gérez les produits de la catégorie ${selectedCategory.name}.`
                : "Gérez votre sélection de cafés, accessoires, prix et stocks depuis votre espace boutique."}
            </p>
            {selectedCategory && (
              <span className="mt-3 inline-flex items-center rounded-full border border-[#E8DED4] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#795A46]">
                Vue de catégorie · {selectedCategory.slug}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedCategory && (
            <Link
              href="/admin/products"
              className={secondaryButtonClassName}
            >
              <ArrowRight size={15} className="rotate-180" />
              Tous les produits
            </Link>
          )}

          <button
            type="button"
            className={secondaryButtonClassName}
            onClick={() => void refreshCatalog()}
            disabled={isLoading || isCategoriesLoading}
          >
            <RefreshCw
              size={15}
              className={isLoading || isCategoriesLoading ? "animate-spin" : ""}
            />
            Actualiser le catalogue
          </button>
        </div>
      </section>

      {/* Messages */}
      {(errorMessage || categoryError || successMessage) && (
        <div
          role={errorMessage || categoryError ? "alert" : "status"}
          className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
            errorMessage || categoryError
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-[#D8E4D2] bg-[#F2F6EF] text-[#42613D]"
          }`}
        >
          {errorMessage || categoryError ? (
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
          )}

          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {errorMessage || categoryError || successMessage}
            </p>
          </div>

          <button
            type="button"
            aria-label="Fermer le message"
            onClick={() => {
              setErrorMessage("");
              setCategoryError("");
              setSuccessMessage("");
            }}
            className="rounded-full p-1 opacity-70 transition-opacity hover:opacity-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Statistiques */}
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-[#E8DED4] bg-white p-5 transition-shadow hover:shadow-md hover:shadow-[#3B2418]/5">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3EAE1] text-[#795A46]">
              <Package size={21} strokeWidth={1.6} />
            </div>

            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9A8577]">
              {selectedCategory ? selectedCategory.name : "Catalogue"}
            </span>
          </div>

          <p className="mt-5 text-sm text-[#8A7567]">
            {selectedCategory
              ? "Total des produits de cette catégorie"
              : "Total des produits"}
          </p>

          <p className="mt-1 text-3xl font-semibold tabular-nums text-[#3B2418]">
            {categoryProducts.length}
          </p>
        </article>

        <article className="rounded-2xl border border-[#E8DED4] bg-white p-5 transition-shadow hover:shadow-md hover:shadow-[#3B2418]/5">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEEAE1] text-[#795A46]">
              <CheckCircle2 size={21} strokeWidth={1.6} />
            </div>

            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9A8577]">
              Visibilité
            </span>
          </div>

          <p className="mt-5 text-sm text-[#8A7567]">
            {selectedCategory
              ? "Produits actifs de cette catégorie"
              : "Produits actifs"}
          </p>

          <p className="mt-1 text-3xl font-semibold tabular-nums text-[#3B2418]">
            {activeProducts}
          </p>
        </article>

        <article className="rounded-2xl border border-[#E8DED4] bg-white p-5 transition-shadow hover:shadow-md hover:shadow-[#3B2418]/5">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F1E8DE] text-[#795A46]">
              <Power size={21} strokeWidth={1.6} />
            </div>

            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9A8577]">
              Statut
            </span>
          </div>

          <p className="mt-5 text-sm text-[#8A7567]">
            {selectedCategory
              ? "Produits désactivés de cette catégorie"
              : "Produits désactivés"}
          </p>

          <p className="mt-1 text-3xl font-semibold tabular-nums text-[#3B2418]">
            {inactiveProducts}
          </p>
        </article>
      </section>

      {/* Formulaire */}
      <section
        id="product-form"
        className="overflow-hidden rounded-2xl border border-[#E8DED4] bg-white shadow-sm shadow-[#3B2418]/2.5"
      >
        <div className="flex flex-col gap-3 border-b border-[#E8DED4]  px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#3B2418] text-[#FBF8F4]">
              <Package size={20} strokeWidth={1.6} />
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A8577]">
                Gestion du catalogue
              </p>

              <h2
                className="text-2xl font-medium text-[#3B2418]"
                style={{ fontFamily: "var(--font-brand)" }}
              >
                {editingId
                  ? "Modifier un produit"
                  : selectedCategory
                    ? `Ajouter un produit à ${selectedCategory.name}`
                    : "Ajouter un produit"}
              </h2>
            </div>
          </div>

          {editingId && (
            <span className="inline-flex w-fit items-center rounded-full border border-[#D8C5B2] bg-[#F1E8DE] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#795A46]">
              Mode modification
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-7 p-5 sm:p-7">
          {/* Informations générales */}
          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F1E8DE] text-xs font-semibold text-[#795A46]">
                01
              </span>

              <div>
                <h3
                  className="text-xl font-medium text-[#3B2418]"
                  style={{ fontFamily: "var(--font-brand)" }}
                >
                  Informations générales
                </h3>

                <p className="text-xs text-[#9A8577]">
                  Identité et description du produit.
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClassName} htmlFor="product-name">
                  Nom du produit *
                </label>

                <input
                  id="product-name"
                  className={fieldClassName}
                  value={draft.name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  placeholder="Ex. Ethiopia Yirgacheffe"
                  maxLength={150}
                  required
                />
              </div>

              <div>
                <label className={labelClassName} htmlFor="product-slug">
                  Slug URL *
                </label>

                <input
                  id="product-slug"
                  className={fieldClassName}
                  value={draft.slug}
                  onChange={(event) => {
                    setSlugWasEdited(true);

                    updateDraft("slug", slugify(event.target.value));
                  }}
                  placeholder="ethiopia-yirgacheffe"
                  maxLength={180}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  required
                />

                <p className="mt-1.5 text-xs text-[#A08D7E]">
                  Utilisé dans l&apos;adresse de la page produit.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClassName} htmlFor="product-description">
                  Description
                </label>

                <textarea
                  id="product-description"
                  className={`${fieldClassName} min-h-32 resize-y`}
                  value={draft.description}
                  onChange={(event) =>
                    updateDraft("description", event.target.value)
                  }
                  placeholder="Présentez les caractéristiques et les particularités de ce produit..."
                  maxLength={5000}
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-[#F0E7DE]" />

          {/* Catégorie, prix et stock */}
          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F1E8DE] text-xs font-semibold text-[#795A46]">
                02
              </span>

              <div>
                <h3
                  className="text-xl font-medium text-[#3B2418]"
                  style={{ fontFamily: "var(--font-brand)" }}
                >
                  Prix et disponibilité
                </h3>

                <p className="text-xs text-[#9A8577]">
                  Classement, tarif et quantité en stock.
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClassName} htmlFor="product-category">
                  Catégorie *
                </label>

                <div className="relative">
                  <select
                    id="product-category"
                    className={`${fieldClassName} appearance-none pr-10`}
                    value={
                      draft.category_id ||
                      (!editingId && categoryFilter !== "all" ? categoryFilter : "")
                    }
                    onChange={(event) =>
                      updateDraft("category_id", event.target.value)
                    }
                    required
                    disabled={
                      isCategoriesLoading || availableCategories.length === 0
                    }
                  >
                    <option value="">
                      {isCategoriesLoading
                        ? "Chargement des catégories..."
                        : "Sélectionner une catégorie"}
                    </option>

                    {availableCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                        {category.is_active === false ? " (inactive)" : ""}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8A6B55]"
                  />
                </div>

                {!isCategoriesLoading &&
                  categories.length === 0 &&
                  !categoryError && (
                    <p className="mt-2 text-xs text-red-600">
                      Aucune catégorie disponible.{" "}
                      <Link
                        href="/admin/categories"
                        className="font-semibold underline underline-offset-2"
                      >
                        Gérer les catégories
                      </Link>
                    </p>
                  )}
              </div>

              <div>
                <label className={labelClassName} htmlFor="product-price">
                  Prix de vente (TND) *
                </label>

                <input
                  id="product-price"
                  className={fieldClassName}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="9999999.999"
                  step="0.001"
                  value={draft.price}
                  onChange={(event) => updateDraft("price", event.target.value)}
                  placeholder="0.000"
                  required
                />
              </div>

              <div>
                <label className={labelClassName} htmlFor="product-stock">
                  Quantité en stock *
                </label>

                <input
                  id="product-stock"
                  className={fieldClassName}
                  type="number"
                  min="0"
                  step="1"
                  value={draft.stock}
                  onChange={(event) => updateDraft("stock", event.target.value)}
                  placeholder="0"
                  required
                />
              </div>
            </div>
          </div>

          <div className="border-t border-[#F0E7DE]" />

          {/* Photo du produit */}
          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F1E8DE] text-xs font-semibold text-[#795A46]">
                03
              </span>

              <div>
                <h3
                  className="text-xl font-medium text-[#3B2418]"
                  style={{ fontFamily: "var(--font-brand)" }}
                >
                  Photo du produit
                </h3>

                <p className="text-xs text-[#9A8577]">
                  Importez une image depuis votre ordinateur.
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              id="product-image-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              disabled={isUploadingImage || isSaving}
              onChange={handleImageInputChange}
            />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_190px]">
              {/* Zone de dépôt */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Déposer une photo ou cliquer pour parcourir les fichiers"
                aria-disabled={isUploadingImage || isSaving}
                onClick={() => {
                  if (!isUploadingImage && !isSaving) {
                    fileInputRef.current?.click();
                  }
                }}
                onKeyDown={(event) => {
                  if (
                    (event.key === "Enter" || event.key === " ") &&
                    !isUploadingImage &&
                    !isSaving
                  ) {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault();

                  if (!isUploadingImage && !isSaving) {
                    setIsDraggingImage(true);
                  }
                }}
                onDragLeave={() => {
                  setIsDraggingImage(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDraggingImage(false);

                  if (isUploadingImage || isSaving) {
                    return;
                  }

                  const file = event.dataTransfer.files?.[0];

                  if (file) {
                    void handleImageFile(file);
                  }
                }}
                className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-8 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6B55] focus-visible:ring-offset-2 ${
                  isDraggingImage
                    ? "border-[#795A46] bg-[#F0E7DE] shadow-inner"
                    : "border-[#D3C1B1] bg-[#FBF8F4] hover:border-[#8A6B55] hover:bg-[#F7F0E9]"
                } ${
                  isUploadingImage || isSaving
                    ? "cursor-not-allowed opacity-60"
                    : ""
                }`}
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1E8DE] text-[#795A46]">
                  {isUploadingImage ? (
                    <Loader2 size={27} className="animate-spin" />
                  ) : (
                    <UploadCloud size={28} strokeWidth={1.5} />
                  )}
                </div>

                {isUploadingImage ? (
                  <>
                    <p className="font-semibold text-[#3B2418]">
                      Importation en cours...
                    </p>

                    <p className="mt-2 text-sm text-[#8A7567]">
                      Votre photo est envoyée vers Supabase Storage.
                    </p>
                  </>
                ) : isDraggingImage ? (
                  <>
                    <p className="font-semibold text-[#3B2418]">
                      Déposez votre photo ici
                    </p>

                    <p className="mt-2 text-sm text-[#8A7567]">
                      Votre fichier est prêt à être importé.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-base font-semibold text-[#3B2418]">
                      Déposez une photo ici pour l&apos;importer
                    </p>

                    <p className="mt-1 text-sm text-[#795A46]">
                      ou cliquez pour parcourir les fichiers
                    </p>
                  </>
                )}

                <span className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-[#3B2418]/15 bg-white px-4 py-2 text-xs font-semibold text-[#665044]">
                  <ImagePlus size={15} />
                  Parcourir les fichiers
                </span>

                <p className="mt-4 text-[11px] text-[#A08D7E]">
                  JPEG, PNG, WebP ou AVIF · 5 Mo maximum
                </p>
              </div>

              {/* Aperçu photo */}
              <div className="flex flex-col rounded-2xl border border-[#E8DED4] bg-white p-3">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9A8577]">
                  Aperçu
                </p>

                <div className="relative flex min-h-40 flex-1 items-center justify-center overflow-hidden rounded-xl bg-[#F3EAE1]">
                  {imagePreview ? (
                    <Image
                      src={imagePreview}
                      alt="Aperçu de la photo du produit"
                      width={190}
                      height={190}
                      unoptimized
                      className="h-full min-h-40 w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 px-3 text-center text-[#A08D7E]">
                      <ImagePlus size={27} strokeWidth={1.4} />
                      <span className="text-xs">Aucune photo sélectionnée</span>
                    </div>
                  )}

                  {isUploadingImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#3B2418]/40 text-white">
                      <Loader2 size={25} className="animate-spin" />
                    </div>
                  )}
                </div>

                {imagePreview && (
                  <button
                    type="button"
                    className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 rounded-full text-xs font-semibold text-red-700 transition-colors hover:bg-red-50"
                    onClick={() => void removeImage()}
                    disabled={isUploadingImage || isSaving}
                  >
                    <X size={14} />
                    Retirer la photo
                  </button>
                )}

                <p className="mt-2 text-center text-[10px] text-[#A08D7E]">
                  {pendingImage
                    ? "Photo importée"
                    : imagePreview
                    ? "Photo actuelle"
                    : "Aperçu du produit"}
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs leading-5 text-[#9A8577]">
              La photo est envoyée immédiatement dans Supabase Storage. Elle
              sera associée au produit après son enregistrement.
            </p>
          </div>

          <div className="border-t border-[#F0E7DE]" />

          {/* Statut et actions */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-[#FBF8F4] px-4 py-3 text-sm text-[#665044]">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#795A46]"
                checked={draft.is_active}
                onChange={(event) =>
                  updateDraft("is_active", event.target.checked)
                }
              />

              <span>
                <span className="block font-semibold text-[#3B2418]">
                  Produit actif
                </span>

                <span className="mt-0.5 block text-xs text-[#9A8577]">
                  Visible dans la boutique client
                </span>
              </span>
            </label>

            <div className="flex flex-wrap gap-3">
              {editingId && (
                <button
                  type="button"
                  className={secondaryButtonClassName}
                  onClick={resetForm}
                  disabled={isSaving || isUploadingImage}
                >
                  Annuler
                </button>
              )}

              <button
                type="submit"
                className={primaryButtonClassName}
                disabled={
                  isSaving ||
                  isUploadingImage ||
                  isCategoriesLoading ||
                  categories.length === 0
                }
              >
                {isUploadingImage ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Importation...
                  </>
                ) : isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    {editingId
                      ? "Enregistrer les modifications"
                      : "Ajouter le produit"}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Catalogue */}
      <section className="overflow-hidden rounded-2xl border border-[#E8DED4] bg-white shadow-sm shadow-[#3B2418]/2.5">
        {/* En-tête du catalogue */}
        <div className="flex flex-col gap-4 border-b border-[#E8DED4] bg-[#FBF8F4] px-5 py-5 sm:px-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A8577]">
              Gestion de l&apos;offre
            </p>

            <h2
              className="mt-1 text-3xl font-medium text-[#3B2418]"
              style={{ fontFamily: "var(--font-brand)" }}
            >
              {selectedCategory
                ? `Produits — ${selectedCategory.name}`
                : "Tous les produits"}
            </h2>

            <p className="mt-1 text-sm text-[#9A8577]">
              {selectedCategory ? (
                <>
                  {filteredProducts.length} résultat
                  {filteredProducts.length === 1 ? "" : "s"} sur {categoryProducts.length} produit
                  {categoryProducts.length === 1 ? "" : "s"} dans cette catégorie.
                </>
              ) : (
                <>
                  {filteredProducts.length} résultat
                  {filteredProducts.length === 1 ? "" : "s"} sur {products.length} produit
                  {products.length === 1 ? "" : "s"}.
                </>
              )}
            </p>
          </div>

          {/* Filtres */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 sm:w-64">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A8577]"
              />

              <input
                aria-label="Rechercher un produit"
                className="min-h-11 w-full rounded-full border border-[#E8DED4] bg-white py-2 pl-10 pr-4 text-sm text-[#3B2418] outline-none transition placeholder:text-[#A08D7E] focus:border-[#8A6B55] focus:ring-2 focus:ring-[#8A6B55]/10"
                placeholder="Rechercher un produit..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="relative sm:min-w-48">
              <select
                aria-label="Filtrer par catégorie"
                className="min-h-11 w-full appearance-none rounded-full border border-[#E8DED4] bg-white py-2 pl-4 pr-9 text-sm text-[#665044] outline-none transition focus:border-[#8A6B55] focus:ring-2 focus:ring-[#8A6B55]/10"
                value={categoryFilter}
                onChange={(event) =>
                  handleCategoryFilterChange(event.target.value)
                }
              >
                <option value="all">Toutes les catégories</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A6B55]"
              />
            </div>
          </div>
        </div>

        {/* Contenu du tableau */}
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-sm text-[#8A7567]">
            <Loader2 size={19} className="animate-spin" />
            Chargement du catalogue...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F3EAE1] text-[#795A46]">
              <Package size={25} strokeWidth={1.5} />
            </div>

            <h3
              className="mt-4 text-xl font-medium text-[#3B2418]"
              style={{ fontFamily: "var(--font-brand)" }}
            >
              {categoryProducts.length === 0 && selectedCategory
                ? "Aucun produit dans cette catégorie"
                : products.length === 0
                  ? "Aucun produit trouvé"
                  : "Aucun résultat"}
            </h3>

            <p className="mt-1 max-w-sm text-sm text-[#9A8577]">
              {categoryProducts.length === 0 && selectedCategory
                ? `Ajoutez le premier produit de la catégorie ${selectedCategory.name}.`
                : products.length === 0
                  ? "Commencez par ajouter un produit à votre catalogue."
                  : "Aucun produit ne correspond à votre recherche."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-237.5 text-left text-sm">
              <thead className="bg-white text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9A8577]">
                <tr>
                  <th className="px-5 py-4 sm:px-6">Produit</th>

                  <th className="px-5 py-4">Catégorie</th>

                  <th className="px-5 py-4">Prix</th>

                  <th className="px-5 py-4">Stock</th>

                  <th className="px-5 py-4">Statut</th>

                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F0E7DE]">
                {filteredProducts.map((product) => {
                  const isBusy = busyProductId === product.id;

                  return (
                    <tr
                      key={product.id}
                      className="align-middle transition-colors hover:bg-[#FBF8F4]/75"
                    >
                      {/* Produit */}
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E8DED4] bg-[#F3EAE1]">
                            {product.image_url ? (
                              <Image
                                src={product.image_url}
                                alt={product.name}
                                width={56}
                                height={56}
                                unoptimized
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ImagePlus size={21} className="text-[#A08D7E]" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="font-semibold text-[#3B2418]">
                              {product.name}
                            </p>

                            <p className="mt-1 max-w-56 truncate text-xs text-[#A08D7E]">
                              {product.slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Catégorie */}
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-[#F3EAE1] px-3 py-1.5 text-xs font-medium text-[#795A46]">
                          {product.category}
                        </span>
                      </td>

                      {/* Prix */}
                      <td className="whitespace-nowrap px-5 py-4 font-semibold tabular-nums text-[#3B2418]">
                        {formatPrice(product.price)}
                      </td>

                      {/* Stock */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-2 font-medium ${
                            product.stock === 0
                              ? "text-red-700"
                              : "text-[#665044]"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              product.stock === 0
                                ? "bg-red-500"
                                : "bg-[#8A9B77]"
                            }`}
                          />

                          {product.stock}
                        </span>
                      </td>

                      {/* Statut */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                            product.is_active
                              ? "bg-[#EEF3E9] text-[#526C45]"
                              : "bg-[#F1E8DE] text-[#8A7567]"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              product.is_active
                                ? "bg-[#78936B]"
                                : "bg-[#A08D7E]"
                            }`}
                          />

                          {product.is_active ? "Actif" : "Désactivé"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={`Modifier ${product.name}`}
                            title="Modifier"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E8DED4] bg-white text-[#795A46] transition-colors hover:border-[#BDAA99] hover:bg-[#F3EAE1] hover:text-[#3B2418] disabled:opacity-50"
                            onClick={() => startEdit(product)}
                            disabled={isBusy || isSaving}
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            aria-label={
                              product.is_active
                                ? `Désactiver ${product.name}`
                                : `Réactiver ${product.name}`
                            }
                            title={
                              product.is_active ? "Désactiver" : "Réactiver"
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E8DED4] bg-white text-[#795A46] transition-colors hover:border-[#BDAA99] hover:bg-[#F3EAE1] hover:text-[#3B2418] disabled:opacity-50"
                            onClick={() => void toggleProduct(product)}
                            disabled={isBusy || isSaving}
                          >
                            {isBusy ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <Power size={15} />
                            )}
                          </button>

                          <button
                            type="button"
                            aria-label={`Supprimer ${product.name}`}
                            title="Supprimer"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-100 bg-white text-red-700 transition-colors hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
                            onClick={() => void removeProduct(product)}
                            disabled={isBusy || isSaving}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pied du tableau */}
        {!isLoading && filteredProducts.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E8DED4] bg-[#FBF8F4] px-5 py-3.5 text-xs text-[#9A8577] sm:px-6">
            <span>
              {filteredProducts.length} produit
              {filteredProducts.length === 1 ? "" : "s"} affiché
              {filteredProducts.length === 1 ? "" : "s"}
            </span>

            <span>
              {activeProducts} actif
              {activeProducts === 1 ? "" : "s"} · {inactiveProducts} désactivé
              {inactiveProducts === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </section>

      {/* Accès catégories */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#E8DED4] bg-white shadow-sm shadow-[#3B2418]/2.5 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6B55]">
            Organisation du catalogue
          </p>

          <p
            className="mt-1 text-xl font-medium text-[#3B2418]"
            style={{ fontFamily: "var(--font-brand)" }}
          >
            Besoin de gérer vos catégories ?
          </p>

          <p className="mt-1 text-xs text-[#795A46]">
            Organisez les produits par famille et gardez une boutique
            structurée.
          </p>
        </div>

        <Link
          href="/admin/categories"
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-[#3B2418]/20 bg-white px-4 py-2 text-sm font-semibold text-[#3B2418] transition-colors hover:bg-[#3B2418] hover:text-white"
        >
          Gérer les catégories
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </div>
  );
}
