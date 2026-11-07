"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Package,
  RefreshCw,
  X,
  Loader2,
  FolderOpen,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ChevronDown,
  ImagePlus,
  Upload,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  product_count: number;
  created_at: string;
  updated_at: string;
}

interface CategoryForm {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  is_active: boolean;
  sort_order: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface UploadedCategoryImage {
  path: string;
  publicUrl: string;
  contentType: string;
  size: number;
}

type CategoryFilter = "all" | "active" | "inactive";

type AuthorizationFailure = (status: 401 | 403) => void;

const EMPTY_FORM: CategoryForm = {
  name: "",
  slug: "",
  description: "",
  image_url: "",
  is_active: true,
  sort_order: 0,
};

const fieldClassName =
  "min-h-11 w-full rounded-xl border border-[#E8DED4] bg-[#FBF8F4] px-4 py-3 text-sm text-[#3B2418] outline-none transition placeholder:text-[#A08D7E] focus:border-[#8A6B55] focus:ring-2 focus:ring-[#8A6B55]/15 disabled:cursor-not-allowed disabled:opacity-60";

const labelClassName =
  "block text-xs font-semibold uppercase tracking-[0.08em] text-[#795A46]";

const primaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#3B2418] px-5 py-2.5 text-sm font-semibold text-[#FBF8F4] shadow-sm transition-all hover:bg-[#684733] disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButtonClassName =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#3B2418]/15 bg-white px-4 py-2 text-sm font-medium text-[#665044] transition-colors hover:border-[#795A46]/40 hover:bg-[#FBF8F4] hover:text-[#3B2418] disabled:cursor-not-allowed disabled:opacity-50";

function generateSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

const MAX_CATEGORY_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_CATEGORY_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

function isAllowedCategoryImage(file: File): boolean {
  return ALLOWED_CATEGORY_IMAGE_TYPES.includes(
    file.type as (typeof ALLOWED_CATEGORY_IMAGE_TYPES)[number]
  );
}

function isManagedCategoryImage(imageUrl: string | null | undefined): boolean {
  if (!imageUrl) return false;

  // The deletion API performs the authoritative origin, bucket and path checks.
  return (
    /^categories\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|avif)$/i.test(
      imageUrl
    ) ||
    /\/storage\/v1\/object\/public\/product-images\/categories\/[0-9a-f-]+\.(jpg|png|webp|avif)(?:\?.*)?$/i.test(
      imageUrl
    )
  );
}

async function authorizedFetch<T>(
  path: string,
  options: RequestInit = {},
  onAuthorizationFailure?: AuthorizationFailure
): Promise<T> {
  const supabase = createClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    onAuthorizationFailure?.(401);
    throw new Error("Your session has expired. Please sign in again.");
  }

  const headers = new Headers(options.headers);

  headers.set("Authorization", `Bearer ${session.access_token}`);

  // The browser must set the multipart boundary when the body is FormData.
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });

  if (response.status === 401) {
    onAuthorizationFailure?.(401);
    throw new Error("Your session has expired. Please sign in again.");
  }

  if (response.status === 403) {
    onAuthorizationFailure?.(403);
    throw new Error("This account is not authorized to manage categories.");
  }

  const result = (await response
    .json()
    .catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message ?? `An error occurred (HTTP ${response.status}).`
    );
  }

  return result.data as T;
}

export function CategoriesManager() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CategoryFilter>("all");

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [pendingImagePath, setPendingImagePath] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [imageNotice, setImageNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [actionId, setActionId] = useState<string | null>(null);

  const handleAuthorizationFailure = useCallback(
    (status: 401 | 403) => {
      router.replace(status === 401 ? "/admin/login" : "/admin/unauthorized");

      router.refresh();
    },
    [router]
  );

  // Initial data loading.
  useEffect(() => {
    let isMounted = true;

    async function initialLoad() {
      try {
        const data = await authorizedFetch<Category[]>(
          "/api/admin/categories",
          {},
          handleAuthorizationFailure
        );

        if (!isMounted) return;

        setCategories(data ?? []);
        setNotice(null);
      } catch (error) {
        if (!isMounted) return;

        setNotice({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to load categories.",
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void initialLoad();

    return () => {
      isMounted = false;
    };
  }, [handleAuthorizationFailure]);

  // Reload categories.
  const loadCategories = useCallback(
    async (preserveNotice = false) => {
      setIsLoading(true);

      try {
        const data = await authorizedFetch<Category[]>(
          "/api/admin/categories",
          {},
          handleAuthorizationFailure
        );

        setCategories(data ?? []);

        if (!preserveNotice) {
          setNotice(null);
        }
      } catch (error) {
        setNotice({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to load categories.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [handleAuthorizationFailure]
  );

  // Statistics.
  const statistics = useMemo(() => {
    return {
      total: categories.length,

      active: categories.filter((category) => category.is_active).length,

      inactive: categories.filter((category) => !category.is_active).length,

      products: categories.reduce(
        (total, category) => total + Number(category.product_count),
        0
      ),
    };
  }, [categories]);

  // Search and status filters.
  const filteredCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return categories.filter((category) => {
      const matchesSearch =
        category.name.toLowerCase().includes(normalizedSearch) ||
        category.slug.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        filter === "all" ||
        (filter === "active" && category.is_active) ||
        (filter === "inactive" && !category.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [categories, search, filter]);

  // Category images are uploaded immediately to the product-images bucket.
  async function deleteCategoryImage(imagePath: string): Promise<void> {
    await authorizedFetch<unknown>(
      "/api/admin/categories/image",
      {
        method: "DELETE",
        body: JSON.stringify({ path: imagePath }),
      },
      handleAuthorizationFailure
    );
  }

  async function uploadCategoryImage(
    file: File
  ): Promise<UploadedCategoryImage> {
    const body = new FormData();
    body.append("file", file);

    return authorizedFetch<UploadedCategoryImage>(
      "/api/admin/categories/upload",
      {
        method: "POST",
        body,
      },
      handleAuthorizationFailure
    );
  }

  async function handleImageFile(file: File | undefined) {
    if (!file) return;

    if (!isAllowedCategoryImage(file)) {
      setImageNotice({
        type: "error",
        message: "Choose a JPEG, PNG, WebP or AVIF image.",
      });
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_CATEGORY_IMAGE_SIZE) {
      setImageNotice({
        type: "error",
        message: "The image must be 5 MB or smaller.",
      });
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }

    setIsUploadingImage(true);
    setImageNotice(null);

    const previousPendingPath = pendingImagePath;

    try {
      const uploaded = await uploadCategoryImage(file);

      if (!uploaded.path || !uploaded.publicUrl) {
        throw new Error("The upload completed without returning an image URL.");
      }

      setForm((previous) => ({ ...previous, image_url: uploaded.publicUrl }));
      setPendingImagePath(uploaded.path);

      if (previousPendingPath && previousPendingPath !== uploaded.path) {
        try {
          await deleteCategoryImage(previousPendingPath);
        } catch {
          setImageNotice({
            type: "error",
            message:
              "The new image was uploaded, but the previous temporary image could not be removed.",
          });
          return;
        }
      }

      setImageNotice({
        type: "success",
        message:
          "Image uploaded successfully. Save the category to publish it.",
      });
    } catch (error) {
      setImageNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to upload the image.",
      });
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  function handleImageInputChange(event: ChangeEvent<HTMLInputElement>) {
    void handleImageFile(event.target.files?.[0]);
  }

  function handleImageDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingImage(false);
    void handleImageFile(event.dataTransfer.files?.[0]);
  }

  async function removeCurrentImage() {
    setImageNotice(null);

    if (pendingImagePath) {
      setIsUploadingImage(true);
      try {
        await deleteCategoryImage(pendingImagePath);
        setPendingImagePath(null);
        updateForm("image_url", "");
        setImageNotice({ type: "success", message: "Image removed." });
      } catch (error) {
        setImageNotice({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to remove the uploaded image.",
        });
      } finally {
        setIsUploadingImage(false);
      }
      return;
    }

    // Existing images are only deleted after the category update succeeds.
    updateForm("image_url", "");
    setImageNotice({
      type: "success",
      message: "Image will be removed when you save the category.",
    });
  }

  // Modal management.
  function openCreateModal() {
    setEditingCategory(null);
    setForm(EMPTY_FORM);
    setPendingImagePath(null);
    setImageNotice(null);
    setSlugManuallyEdited(false);
    setNotice(null);
    setIsModalOpen(true);
  }

  function openEditModal(category: Category) {
    setEditingCategory(category);

    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      image_url: category.image_url ?? "",
      is_active: category.is_active,
      sort_order: category.sort_order,
    });

    setPendingImagePath(null);
    setImageNotice(null);
    setSlugManuallyEdited(true);
    setNotice(null);
    setIsModalOpen(true);
  }

  async function closeModal() {
    if (isSaving || isUploadingImage) return;

    const temporaryImagePath = pendingImagePath;

    setIsModalOpen(false);
    setEditingCategory(null);
    setForm(EMPTY_FORM);
    setPendingImagePath(null);
    setImageNotice(null);

    // A newly uploaded image that was not saved must not be left in Storage.
    if (temporaryImagePath) {
      try {
        await deleteCategoryImage(temporaryImagePath);
      } catch {
        setNotice({
          type: "error",
          message:
            "The dialog was closed, but its temporary image could not be removed from Storage.",
        });
      }
    }
  }

  // Form management.
  function updateForm<K extends keyof CategoryForm>(
    key: K,
    value: CategoryForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function handleNameChange(value: string) {
    setForm((previous) => ({
      ...previous,
      name: value,
      slug:
        !editingCategory && !slugManuallyEdited
          ? generateSlug(value)
          : previous.slug,
    }));
  }

  // Create or update category.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isUploadingImage) return;

    setIsSaving(true);
    setNotice(null);

    const categoryBeingEdited = editingCategory;
    const isEditing = Boolean(categoryBeingEdited);
    const previousImageUrl = categoryBeingEdited?.image_url ?? null;
    const nextImageUrl = form.image_url.trim() || null;

    const url = isEditing
      ? `/api/admin/categories/${categoryBeingEdited!.id}`
      : "/api/admin/categories";

    try {
      await authorizedFetch<Category>(
        url,
        {
          method: isEditing ? "PATCH" : "POST",
          body: JSON.stringify({
            name: form.name.trim(),
            slug: form.slug.trim(),
            description: form.description.trim() || null,
            image_url: nextImageUrl,
            is_active: form.is_active,
            sort_order: form.sort_order,
          }),
        },
        handleAuthorizationFailure
      );

      setIsModalOpen(false);
      setEditingCategory(null);
      setForm(EMPTY_FORM);
      setPendingImagePath(null);
      setImageNotice(null);

      let cleanupWarning = "";
      if (
        previousImageUrl &&
        previousImageUrl !== nextImageUrl &&
        isManagedCategoryImage(previousImageUrl)
      ) {
        try {
          await deleteCategoryImage(previousImageUrl);
        } catch {
          cleanupWarning =
            " The previous image is no longer linked to this category but could not be removed from Storage.";
        }
      }

      setNotice({
        type: cleanupWarning ? "error" : "success",
        message:
          (isEditing
            ? "Category updated successfully."
            : "Category created successfully.") + cleanupWarning,
      });

      await loadCategories(true);
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to save the category.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  // Activate or deactivate category.
  async function toggleCategory(category: Category) {
    const nextStatus = !category.is_active;

    if (
      !nextStatus &&
      category.product_count > 0 &&
      !window.confirm(
        `This category contains ${category.product_count} product(s). Deactivating it may affect their visibility in the storefront. Continue?`
      )
    ) {
      return;
    }

    setActionId(category.id);
    setNotice(null);

    try {
      await authorizedFetch<Category>(
        `/api/admin/categories/${category.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            is_active: nextStatus,
          }),
        },
        handleAuthorizationFailure
      );

      setNotice({
        type: "success",
        message: nextStatus
          ? "Category activated successfully."
          : "Category deactivated successfully.",
      });

      await loadCategories(true);
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to update category status.",
      });
    } finally {
      setActionId(null);
    }
  }

  // Delete category.
  async function handleDelete(category: Category) {
    if (category.product_count > 0) {
      setNotice({
        type: "error",
        message:
          "This category still contains products. Reassign them before deleting it.",
      });

      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete the category "${category.name}"?`
    );

    if (!confirmed) return;

    setActionId(category.id);
    setNotice(null);

    try {
      await authorizedFetch<unknown>(
        `/api/admin/categories/${category.id}`,
        {
          method: "DELETE",
        },
        handleAuthorizationFailure
      );

      let cleanupWarning = "";
      if (category.image_url && isManagedCategoryImage(category.image_url)) {
        try {
          await deleteCategoryImage(category.image_url);
        } catch {
          cleanupWarning =
            " The category was deleted, but its image could not be removed from Storage.";
        }
      }

      setNotice({
        type: cleanupWarning ? "error" : "success",
        message: "Category deleted successfully." + cleanupWarning,
      });

      await loadCategories(true);
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to delete the category.",
      });
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-8 text-[#3B2418]">
      {/* Page heading */}
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#8A6B55] transition-colors hover:text-[#3B2418]"
          >
            <ArrowLeft size={14} />
            Back to dashboard
          </Link>

          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A8577]">
              BARISTABAR / CATALOG / CATEGORIES
            </p>

            <h1
              className="mt-1 text-4xl font-medium tracking-tight text-[#3B2418] sm:text-5xl"
              style={{ fontFamily: "var(--font-brand)" }}
            >
              Categories
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#795A46]">
              Organize your product catalog and manage the collections displayed
              in your storefront.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadCategories()}
          disabled={isLoading}
          className={secondaryButtonClassName}
        >
          <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
          Refresh categories
        </button>
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total categories",
            value: statistics.total,
            icon: FolderOpen,
            caption: "Catalog",
          },
          {
            label: "Active categories",
            value: statistics.active,
            icon: Eye,
            caption: "Visible",
          },
          {
            label: "Inactive categories",
            value: statistics.inactive,
            icon: EyeOff,
            caption: "Hidden",
          },
          {
            label: "Associated products",
            value: statistics.products,
            icon: Package,
            caption: "Products",
          },
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <article
              key={stat.label}
              className="rounded-2xl border border-[#E8DED4] bg-white p-5 transition-shadow hover:shadow-md hover:shadow-[#3B2418]/5"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3EAE1] text-[#795A46]">
                  <Icon size={21} strokeWidth={1.6} />
                </div>

                <span className="rounded-full bg-[#F8F5F0] px-2.5 py-1 text-[10px] font-medium text-[#8A6B55]">
                  {stat.caption}
                </span>
              </div>

              <p className="mt-5 text-sm text-[#8A7567]">{stat.label}</p>

              <p className="mt-1 text-3xl font-semibold tabular-nums text-[#3B2418]">
                {stat.value}
              </p>
            </article>
          );
        })}
      </section>

      {/* Notifications */}
      {notice && (
        <div
          role={notice.type === "error" ? "alert" : "status"}
          className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
            notice.type === "success"
              ? "border-[#D8E4D2] bg-[#F2F6EF] text-[#42613D]"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          )}

          <p className="min-w-0 flex-1 font-medium">{notice.message}</p>

          <button
            type="button"
            onClick={() => setNotice(null)}
            className="rounded-full p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Category management */}
      <section className="overflow-hidden rounded-2xl border border-[#E8DED4] bg-white shadow-sm shadow-[#3B2418]/2.5">
        {/* Toolbar heading */}
        <div className="flex flex-col gap-4 border-b border-[#E8DED4] bg-[#FBF8F4] px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A8577]">
              Store organization
            </p>

            <h2
              className="mt-1 text-3xl font-medium text-[#3B2418]"
              style={{ fontFamily: "var(--font-brand)" }}
            >
              Your categories
            </h2>

            <p className="mt-1 text-sm text-[#9A8577]">
              Manage and organize your storefront collections.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className={primaryButtonClassName}
          >
            <Plus size={17} />
            Add category
          </button>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col gap-3 border-b border-[#E8DED4] px-5 py-4 sm:flex-row sm:px-7">
          <div className="relative min-w-0 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A8577]"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search categories..."
              aria-label="Search categories"
              className="min-h-11 w-full rounded-full border border-[#E8DED4] bg-[#FBF8F4] py-2 pl-10 pr-4 text-sm text-[#3B2418] outline-none transition placeholder:text-[#A08D7E] focus:border-[#8A6B55] focus:ring-2 focus:ring-[#8A6B55]/10"
            />
          </div>

          <div className="relative sm:min-w-44">
            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as CategoryFilter)
              }
              className="min-h-11 w-full appearance-none rounded-full border border-[#E8DED4] bg-[#FBF8F4] px-4 pr-10 text-sm text-[#665044] outline-none transition focus:border-[#8A6B55]"
              aria-label="Filter categories by status"
            >
              <option value="all">All categories</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A6B55]"
            />
          </div>

          <button
            type="button"
            onClick={() => void loadCategories()}
            disabled={isLoading}
            className={secondaryButtonClassName}
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Table heading */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 sm:px-7">
          <h3
            className="text-2xl font-medium text-[#3B2418]"
            style={{ fontFamily: "var(--font-brand)" }}
          >
            Saved categories
          </h3>

          <span className="rounded-full bg-[#F3EAE1] px-3 py-1.5 text-xs font-semibold text-[#795A46]">
            {filteredCategories.length} result
            {filteredCategories.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#795A46]" />

            <p className="text-sm text-[#8A7567]">Loading categories...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          /* Empty state */
          <div className="flex min-h-64 flex-col items-center justify-center px-4 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F3EAE1] text-[#795A46]">
              <FolderOpen size={25} strokeWidth={1.5} />
            </div>

            <h3
              className="mt-4 text-2xl font-medium text-[#3B2418]"
              style={{ fontFamily: "var(--font-brand)" }}
            >
              No categories found
            </h3>

            <p className="mt-2 max-w-sm text-sm leading-6 text-[#9A8577]">
              No category matches your search. Try another filter or create a
              new category.
            </p>

            {categories.length === 0 && (
              <button
                type="button"
                onClick={openCreateModal}
                className={`${primaryButtonClassName} mt-5`}
              >
                <Plus size={16} />
                Create your first category
              </button>
            )}
          </div>
        ) : (
          /* Category table */
          <div className="overflow-x-auto">
            <table className="w-full min-w-250 text-left text-sm">
              <thead className="bg-[#FBF8F4] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9A8577]">
                <tr>
                  <th className="px-5 py-4 sm:px-7">Category</th>

                  <th className="px-5 py-4">Slug</th>

                  <th className="px-5 py-4">Products</th>

                  <th className="px-5 py-4">Display order</th>

                  <th className="px-5 py-4">Status</th>

                  <th className="px-5 py-4">Created</th>

                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F0E7DE]">
                {filteredCategories.map((category) => (
                  <tr
                    key={category.id}
                    className="transition-colors hover:bg-[#FBF8F4]/75"
                  >
                    <td className="px-5 py-4 sm:px-7">
                      <div className="flex min-w-52 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E8DED4] bg-[#F3EAE1]">
                          {category.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={category.image_url}
                              alt={category.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <FolderOpen size={20} className="text-[#9A8577]" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-[#3B2418]">
                            {category.name}
                          </p>

                          <p className="mt-1 max-w-56 truncate text-xs text-[#9A8577]">
                            {category.description || "No description"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <code className="rounded-lg bg-[#F3EAE1] px-2.5 py-1.5 text-xs text-[#795A46]">
                        {category.slug}
                      </code>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 font-medium text-[#665044]">
                        <Package size={15} className="text-[#9A8577]" />
                        {category.product_count}
                      </span>
                    </td>

                    <td className="px-5 py-4 tabular-nums text-[#665044]">
                      {category.sort_order}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                          category.is_active
                            ? "bg-[#EEF3E9] text-[#526C45]"
                            : "bg-[#F1E8DE] text-[#8A7567]"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            category.is_active ? "bg-[#78936B]" : "bg-[#A08D7E]"
                          }`}
                        />

                        {category.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-xs text-[#9A8577]">
                      {formatDate(category.created_at)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/products?category=${encodeURIComponent(
                            category.id
                          )}`}
                          title={`View products in ${category.name}`}
                          aria-label={`View products in ${category.name}`}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[#E8DED4] bg-white px-3 text-xs font-semibold text-[#795A46] transition-colors hover:border-[#BDAA99] hover:bg-[#F3EAE1] hover:text-[#3B2418]"
                        >
                          <Package size={14} />
                          <span>Products</span>
                        </Link>

                        <button
                          type="button"
                          title="Edit category"
                          aria-label={`Edit ${category.name}`}
                          onClick={() => openEditModal(category)}
                          disabled={actionId === category.id}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E8DED4] bg-white text-[#795A46] transition-colors hover:border-[#BDAA99] hover:bg-[#F3EAE1] hover:text-[#3B2418] disabled:opacity-50"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          title={
                            category.is_active
                              ? "Deactivate category"
                              : "Activate category"
                          }
                          aria-label={
                            category.is_active
                              ? `Deactivate ${category.name}`
                              : `Activate ${category.name}`
                          }
                          onClick={() => void toggleCategory(category)}
                          disabled={actionId === category.id}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E8DED4] bg-white text-[#795A46] transition-colors hover:border-[#BDAA99] hover:bg-[#F3EAE1] hover:text-[#3B2418] disabled:opacity-50"
                        >
                          {actionId === category.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : category.is_active ? (
                            <EyeOff size={15} />
                          ) : (
                            <Eye size={15} />
                          )}
                        </button>

                        <button
                          type="button"
                          title={
                            category.product_count > 0
                              ? "Reassign products before deleting"
                              : "Delete category"
                          }
                          aria-label={`Delete ${category.name}`}
                          onClick={() => void handleDelete(category)}
                          disabled={
                            actionId === category.id ||
                            category.product_count > 0
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-100 bg-white text-red-700 transition-colors hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table footer */}
        <div className="flex flex-col gap-2 border-t border-[#E8DED4] bg-[#FBF8F4] px-5 py-3.5 text-xs text-[#9A8577] sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p>
            {filteredCategories.length} of {categories.length} categories
            displayed.
          </p>

          <p>Categories linked to products cannot be deleted.</p>
        </div>
      </section>

      {/* Create / Edit modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center overflow-y-auto bg-[#1C100C]/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
            className="my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-[#E8DED4] bg-white shadow-2xl shadow-[#3B2418]/20"
          >
            {/* Modal heading */}
            <div className="flex items-center justify-between border-b border-[#E8DED4] bg-[#FBF8F4] px-5 py-5 sm:px-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A8577]">
                  Category management
                </p>

                <h2
                  id="category-modal-title"
                  className="mt-1 text-3xl font-medium text-[#3B2418]"
                  style={{ fontFamily: "var(--font-brand)" }}
                >
                  {editingCategory ? "Edit category" : "New category"}
                </h2>

                <p className="mt-1 text-sm text-[#9A8577]">
                  Enter the details for this category.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving || isUploadingImage}
                aria-label="Close dialog"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E8DED4] text-[#795A46] transition hover:bg-[#F1E8DE] disabled:opacity-50"
              >
                <X size={17} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="max-h-[calc(100vh-170px)] space-y-5 overflow-y-auto p-5 sm:p-6"
            >
              {/* Name */}
              <div className="space-y-2">
                <label htmlFor="category-name" className={labelClassName}>
                  Category name *
                </label>

                <input
                  id="category-name"
                  type="text"
                  required
                  maxLength={100}
                  autoFocus
                  value={form.name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  placeholder="Example: Coffee Beans"
                  className={fieldClassName}
                />
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <label htmlFor="category-slug" className={labelClassName}>
                  URL slug *
                </label>

                <input
                  id="category-slug"
                  type="text"
                  required
                  maxLength={120}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  title="Use lowercase letters, numbers, and single hyphens only."
                  value={form.slug}
                  onChange={(event) => {
                    setSlugManuallyEdited(true);
                    updateForm("slug", event.target.value);
                  }}
                  placeholder="coffee-beans"
                  className={fieldClassName}
                />

                <p className="text-xs text-[#9A8577]">
                  Used in the storefront category URL.
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label
                  htmlFor="category-description"
                  className={labelClassName}
                >
                  Description
                </label>

                <textarea
                  id="category-description"
                  rows={3}
                  maxLength={2000}
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  placeholder="Describe this category..."
                  className={`${fieldClassName} min-h-24 resize-y`}
                />
              </div>

              {/* Category image upload */}
              <div className="space-y-2">
                <label className={labelClassName}>Category image</label>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={handleImageInputChange}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                />

                {form.image_url ? (
                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDraggingImage(true);
                    }}
                    onDragLeave={(event) => {
                      if (event.currentTarget === event.target) {
                        setIsDraggingImage(false);
                      }
                    }}
                    onDrop={handleImageDrop}
                    className={`overflow-hidden rounded-2xl border bg-[#FBF8F4] transition-colors ${
                      isDraggingImage
                        ? "border-[#8A6B55] ring-2 ring-[#8A6B55]/20"
                        : "border-[#E8DED4]"
                    }`}
                  >
                    <div className="relative flex min-h-44 items-center justify-center bg-[#F3EAE1]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.image_url}
                        alt="Category preview"
                        className="max-h-64 w-full object-cover"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 p-3">
                      <p className="min-w-0 flex-1 truncate text-xs text-[#795A46]">
                        {pendingImagePath
                          ? "New image uploaded"
                          : "Current category image"}
                      </p>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={isUploadingImage || isSaving}
                          className={secondaryButtonClassName}
                        >
                          {isUploadingImage ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Upload size={15} />
                          )}
                          Replace
                        </button>

                        <button
                          type="button"
                          onClick={() => void removeCurrentImage()}
                          disabled={isUploadingImage || isSaving}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDraggingImage(true);
                    }}
                    onDragLeave={(event) => {
                      if (event.currentTarget === event.target) {
                        setIsDraggingImage(false);
                      }
                    }}
                    onDrop={handleImageDrop}
                    className={`flex min-h-44 flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-7 text-center transition-colors ${
                      isDraggingImage
                        ? "border-[#8A6B55] bg-[#F3EAE1]"
                        : "border-[#DCCFC3] bg-[#FBF8F4] hover:border-[#BDAA99]"
                    }`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F0E7DE] text-[#795A46]">
                      {isUploadingImage ? (
                        <Loader2 size={22} className="animate-spin" />
                      ) : (
                        <ImagePlus size={22} />
                      )}
                    </div>

                    <p className="mt-3 text-sm font-semibold text-[#3B2418]">
                      {isUploadingImage
                        ? "Uploading image..."
                        : "Drop an image here"}
                    </p>

                    <p className="mt-1 text-xs text-[#9A8577]">
                      JPEG, PNG, WebP or AVIF · Maximum 5 MB
                    </p>

                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={isUploadingImage || isSaving}
                      className="mt-4 inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-[#3B2418]/15 bg-white px-4 py-2 text-xs font-semibold text-[#795A46] transition-colors hover:bg-[#F3EAE1] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Upload size={14} />
                      Browse files
                    </button>
                  </div>
                )}

                {imageNotice && (
                  <p
                    role={imageNotice.type === "error" ? "alert" : "status"}
                    className={`text-xs font-medium ${
                      imageNotice.type === "error"
                        ? "text-red-700"
                        : "text-[#526C45]"
                    }`}
                  >
                    {imageNotice.message}
                  </p>
                )}

                <p className="text-xs leading-5 text-[#9A8577]">
                  The image is uploaded to Supabase Storage immediately. Save
                  the category to apply the change.
                </p>
              </div>

              {/* Sort order */}
              <div className="space-y-2">
                <label htmlFor="category-sort" className={labelClassName}>
                  Display order
                </label>

                <input
                  id="category-sort"
                  type="number"
                  min={0}
                  max={999999}
                  step={1}
                  value={form.sort_order}
                  onChange={(event) =>
                    updateForm(
                      "sort_order",
                      event.target.value === "" ? 0 : Number(event.target.value)
                    )
                  }
                  className={fieldClassName}
                />

                <p className="text-xs text-[#9A8577]">
                  Lower numbers appear first.
                </p>
              </div>

              {/* Active status */}
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#E8DED4] bg-[#FBF8F4] p-4">
                <div>
                  <p className="text-sm font-semibold text-[#3B2418]">
                    Active category
                  </p>

                  <p className="mt-1 text-xs text-[#9A8577]">
                    Control this category&apos;s visibility in the storefront.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    updateForm("is_active", event.target.checked)
                  }
                  className="h-4 w-4 accent-[#795A46]"
                />
              </label>

              {/* Modal actions */}
              <div className="flex flex-col-reverse gap-3 border-t border-[#F0E7DE] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving || isUploadingImage}
                  className={secondaryButtonClassName}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving || isUploadingImage}
                  className={primaryButtonClassName}
                >
                  {isSaving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}

                  {isSaving
                    ? "Saving..."
                    : editingCategory
                    ? "Save changes"
                    : "Create category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
