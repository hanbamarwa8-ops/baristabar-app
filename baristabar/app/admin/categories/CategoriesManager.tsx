
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

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
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

// ============================================================
// TYPES
// ============================================================

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

// ============================================================
// HELPERS
// ============================================================

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

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

// ============================================================
// AUTHENTICATED API REQUEST
// ============================================================

async function authorizedFetch<T>(
  path: string,
  options: RequestInit = {},
  onAuthorizationFailure?: AuthorizationFailure,
): Promise<T> {
  const supabase = createClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    onAuthorizationFailure?.(401);

    throw new Error(
      "Ta session a expiré. Reconnecte-toi.",
    );
  }

  const headers = new Headers(options.headers);

  headers.set(
    "Authorization",
    `Bearer ${session.access_token}`,
  );

  if (options.body && !headers.has("Content-Type")) {
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

    throw new Error(
      "Ta session a expiré. Reconnecte-toi.",
    );
  }

  if (response.status === 403) {
    onAuthorizationFailure?.(403);

    throw new Error(
      "Ce compte n'est pas autorisé à gérer les catégories.",
    );
  }

  const result = (
    await response.json().catch(() => null)
  ) as ApiResponse<T> | null;

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message ??
        `Une erreur est survenue (HTTP ${response.status}).`,
    );
  }

  return result.data as T;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function CategoriesManager() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CategoryFilter>("all");

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingCategory, setEditingCategory] =
    useState<Category | null>(null);

  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);

  const [slugManuallyEdited, setSlugManuallyEdited] =
    useState(false);

  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [actionId, setActionId] = useState<string | null>(null);

  // ==========================================================
  // AUTHORIZATION FAILURE
  // ==========================================================

  const handleAuthorizationFailure = useCallback(
    (status: 401 | 403) => {
      router.replace(
        status === 401
          ? "/admin/login"
          : "/admin/unauthorized",
      );

      router.refresh();
    },
    [router],
  );

  // ==========================================================
  // INITIAL DATA LOADING
  // ==========================================================

  useEffect(() => {
    let isMounted = true;

    async function initialLoad() {
      try {
        const data = await authorizedFetch<Category[]>(
          "/api/admin/categories",
          {},
          handleAuthorizationFailure,
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
              : "Impossible de charger les catégories.",
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

  // ==========================================================
  // RELOAD CATEGORIES
  // ==========================================================

  const loadCategories = useCallback(
    async (preserveNotice = false) => {
      setIsLoading(true);

      try {
        const data = await authorizedFetch<Category[]>(
          "/api/admin/categories",
          {},
          handleAuthorizationFailure,
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
              : "Impossible de charger les catégories.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [handleAuthorizationFailure],
  );

  // ==========================================================
  // STATISTICS
  // ==========================================================

  const statistics = useMemo(() => {
    return {
      total: categories.length,

      active: categories.filter(
        (category) => category.is_active,
      ).length,

      inactive: categories.filter(
        (category) => !category.is_active,
      ).length,

      products: categories.reduce(
        (total, category) =>
          total + Number(category.product_count),
        0,
      ),
    };
  }, [categories]);

  // ==========================================================
  // FILTER CATEGORIES
  // ==========================================================

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

  // ==========================================================
  // MODAL MANAGEMENT
  // ==========================================================

  function openCreateModal() {
    setEditingCategory(null);
    setForm(EMPTY_FORM);
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

    setSlugManuallyEdited(true);
    setNotice(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) return;

    setIsModalOpen(false);
    setEditingCategory(null);
    setForm(EMPTY_FORM);
  }

  // ==========================================================
  // FORM MANAGEMENT
  // ==========================================================

  function updateForm<K extends keyof CategoryForm>(
    key: K,
    value: CategoryForm[K],
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

  // ==========================================================
  // CREATE / UPDATE CATEGORY
  // ==========================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setIsSaving(true);
    setNotice(null);

    const isEditing = Boolean(editingCategory);

    const url = isEditing
      ? `/api/admin/categories/${editingCategory!.id}`
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
            image_url: form.image_url.trim() || null,
            is_active: form.is_active,
            sort_order: form.sort_order,
          }),
        },
        handleAuthorizationFailure,
      );

      setIsModalOpen(false);
      setEditingCategory(null);
      setForm(EMPTY_FORM);

      setNotice({
        type: "success",
        message: isEditing
          ? "Catégorie modifiée avec succès."
          : "Catégorie créée avec succès.",
      });

      await loadCategories(true);
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Impossible d'enregistrer la catégorie.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  // ==========================================================
  // ACTIVATE / DEACTIVATE CATEGORY
  // ==========================================================

  async function toggleCategory(category: Category) {
    const nextStatus = !category.is_active;

    if (
      !nextStatus &&
      category.product_count > 0 &&
      !window.confirm(
        `Cette catégorie contient ${category.product_count} produit(s). Sa désactivation peut affecter leur visibilité dans la boutique. Continuer ?`,
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
        handleAuthorizationFailure,
      );

      setNotice({
        type: "success",
        message: nextStatus
          ? "Catégorie activée avec succès."
          : "Catégorie désactivée avec succès.",
      });

      await loadCategories(true);
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Impossible de modifier le statut.",
      });
    } finally {
      setActionId(null);
    }
  }

  // ==========================================================
  // DELETE CATEGORY
  // ==========================================================

  async function handleDelete(category: Category) {
    if (category.product_count > 0) {
      setNotice({
        type: "error",
        message:
          "Cette catégorie contient encore des produits. Réaffecte-les avant de la supprimer.",
      });

      return;
    }

    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer la catégorie "${category.name}" ? Cette action est définitive.`,
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
        handleAuthorizationFailure,
      );

      setNotice({
        type: "success",
        message: "Catégorie supprimée avec succès.",
      });

      await loadCategories(true);
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Impossible de supprimer la catégorie.",
      });
    } finally {
      setActionId(null);
    }
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-6">

      {/* STATISTICS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total catégories",
            value: statistics.total,
            icon: FolderOpen,
          },
          {
            label: "Catégories actives",
            value: statistics.active,
            icon: Eye,
          },
          {
            label: "Catégories inactives",
            value: statistics.inactive,
            icon: EyeOff,
          },
          {
            label: "Produits associés",
            value: statistics.products,
            icon: Package,
          },
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-xl border bg-card p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {stat.label}
                </p>

                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>

              <p className="mt-3 text-3xl font-semibold tracking-tight">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* NOTIFICATIONS */}

      {notice && (
        <div
          role="alert"
          className={`flex items-start gap-3 rounded-lg border p-4 ${
            notice.type === "success"
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          )}

          <p className="text-sm">{notice.message}</p>

          <button
            type="button"
            onClick={() => setNotice(null)}
            className="ml-auto rounded p-1 hover:bg-black/5"
            aria-label="Fermer le message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* TOOLBAR */}

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">

          <div>
            <h2 className="text-lg font-semibold">
              Catalogue des catégories
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Organise et contrôle les catégories de la boutique.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Ajouter une catégorie
          </button>

        </div>

        {/* SEARCH AND FILTER */}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher une catégorie..."
              className="h-10 w-full rounded-lg border bg-background pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as CategoryFilter)
            }
            className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary"
            aria-label="Filtrer les catégories"
          >
            <option value="all">Toutes les catégories</option>
            <option value="active">Actives</option>
            <option value="inactive">Inactives</option>
          </select>

          <button
            type="button"
            onClick={() => void loadCategories()}
            disabled={isLoading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm transition hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isLoading ? "animate-spin" : ""
              }`}
            />

            Actualiser
          </button>

        </div>
      </div>

      {/* CATEGORY TABLE */}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">

        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold">
            Catégories enregistrées
          </h2>

          <span className="text-sm text-muted-foreground">
            {filteredCategories.length} résultat(s)
          </span>
        </div>

        {isLoading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />

            <p className="text-sm text-muted-foreground">
              Chargement des catégories...
            </p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground/50" />

            <h3 className="mt-4 font-semibold">
              Aucune catégorie trouvée
            </h3>

            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Aucune catégorie ne correspond à votre recherche.
              Essayez un autre filtre ou créez une nouvelle catégorie.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">

              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">
                    Catégorie
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Slug
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Produits
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Ordre
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Statut
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Création
                  </th>

                  <th className="px-5 py-3 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filteredCategories.map((category) => (
                  <tr
                    key={category.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="px-5 py-4">
                      <div className="flex min-w-48 items-center gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                          {category.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={category.image_url}
                              alt={category.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <FolderOpen className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-medium">
                            {category.name}
                          </p>

                          <p className="mt-1 max-w-56 truncate text-xs text-muted-foreground">
                            {category.description || "Aucune description"}
                          </p>
                        </div>

                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <code className="rounded bg-muted px-2 py-1 text-xs">
                        {category.slug}
                      </code>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {category.product_count}
                      </span>
                    </td>

                    <td className="px-5 py-4 tabular-nums">
                      {category.sort_order}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          category.is_active
                            ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            category.is_active
                              ? "bg-green-600"
                              : "bg-muted-foreground"
                          }`}
                        />

                        {category.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                      {formatDate(category.created_at)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">

                        <button
                          type="button"
                          title="Modifier"
                          aria-label={`Modifier ${category.name}`}
                          onClick={() => openEditModal(category)}
                          disabled={actionId === category.id}
                          className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          title={
                            category.is_active
                              ? "Désactiver"
                              : "Activer"
                          }
                          aria-label={
                            category.is_active
                              ? `Désactiver ${category.name}`
                              : `Activer ${category.name}`
                          }
                          onClick={() => void toggleCategory(category)}
                          disabled={actionId === category.id}
                          className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                        >
                          {category.is_active ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          title={
                            category.product_count > 0
                              ? "Réaffectez les produits avant suppression"
                              : "Supprimer"
                          }
                          aria-label={`Supprimer ${category.name}`}
                          onClick={() => void handleDelete(category)}
                          disabled={
                            actionId === category.id ||
                            category.product_count > 0
                          }
                          className="rounded-lg p-2 text-muted-foreground transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-red-950"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Les catégories associées à des produits ne peuvent pas être supprimées.
          </p>
        </div>

      </div>

      {/* CREATE / EDIT MODAL */}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
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
            className="my-auto w-full max-w-xl rounded-2xl border bg-background shadow-xl"
          >

            <div className="flex items-center justify-between border-b px-6 py-4">

              <div>
                <h2
                  id="category-modal-title"
                  className="text-lg font-semibold"
                >
                  {editingCategory
                    ? "Modifier la catégorie"
                    : "Nouvelle catégorie"}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Renseigne les informations de la catégorie.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                aria-label="Fermer"
                className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >

              {/* NAME */}

              <div className="space-y-2">
                <label
                  htmlFor="category-name"
                  className="text-sm font-medium"
                >
                  Nom de la catégorie *
                </label>

                <input
                  id="category-name"
                  type="text"
                  required
                  maxLength={100}
                  autoFocus
                  value={form.name}
                  onChange={(event) =>
                    handleNameChange(event.target.value)
                  }
                  placeholder="Ex : Coffee Beans"
                  className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>

              {/* SLUG */}

              <div className="space-y-2">
                <label
                  htmlFor="category-slug"
                  className="text-sm font-medium"
                >
                  Slug *
                </label>

                <input
                  id="category-slug"
                  type="text"
                  required
                  maxLength={120}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  title="Utilise uniquement des minuscules, chiffres et tirets simples."
                  value={form.slug}
                  onChange={(event) => {
                    setSlugManuallyEdited(true);
                    updateForm("slug", event.target.value);
                  }}
                  placeholder="coffee-beans"
                  className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />

                <p className="text-xs text-muted-foreground">
                  Identifiant utilisé dans les URL de la boutique.
                </p>
              </div>

              {/* DESCRIPTION */}

              <div className="space-y-2">
                <label
                  htmlFor="category-description"
                  className="text-sm font-medium"
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
                  placeholder="Décris cette catégorie..."
                  className="w-full resize-y rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>

              {/* IMAGE */}

              <div className="space-y-2">
                <label
                  htmlFor="category-image"
                  className="text-sm font-medium"
                >
                  URL de l&apos;image
                </label>

                <input
                  id="category-image"
                  type="text"
                  maxLength={2048}
                  value={form.image_url}
                  onChange={(event) =>
                    updateForm("image_url", event.target.value)
                  }
                  placeholder="/images/categories/coffee-beans.jpg"
                  className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />

                {form.image_url && (
                  <div className="mt-2 h-28 overflow-hidden rounded-lg border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.image_url}
                      alt="Aperçu de la catégorie"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* SORT ORDER */}

              <div className="space-y-2">
                <label
                  htmlFor="category-sort"
                  className="text-sm font-medium"
                >
                  Ordre d&apos;affichage
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
                      event.target.value === ""
                        ? 0
                        : Number(event.target.value),
                    )
                  }
                  className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>

              {/* ACTIVE STATUS */}

              <label className="flex cursor-pointer items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">
                    Catégorie active
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Contrôle la visibilité de la catégorie.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    updateForm("is_active", event.target.checked)
                  }
                  className="h-4 w-4 accent-primary"
                />
              </label>

              {/* MODAL FOOTER */}

              <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  {isSaving
                    ? "Enregistrement..."
                    : editingCategory
                      ? "Enregistrer les modifications"
                      : "Créer la catégorie"}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
