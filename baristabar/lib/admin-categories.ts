import { getPool } from "@/lib/db";

// TYPES
export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  product_count: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CategoryWriteInput {
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

interface AdminCategoryRow extends Omit<
  AdminCategory,
  "product_count"
> {
  product_count: number | string;
}

// SQL
const CATEGORY_SELECT = `
  SELECT
    c.id,
    c.name,
    c.slug,
    c.description,
    c.image_url,
    c.is_active,
    c.sort_order,
    COUNT(p.id)::integer AS product_count,
    c.created_at,
    c.updated_at
  FROM public.categories c
  LEFT JOIN public.products p
    ON p.category_id = c.id
`;

// HELPERS
function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function serializeCategory(
  category: AdminCategoryRow,
): AdminCategory {
  return {
    ...category,
    sort_order: Number(category.sort_order),
    product_count: Number(category.product_count),
  };
}

function optionalText(
  value: unknown,
  maxLength: number,
): string | null | undefined {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    return undefined;
  }

  return trimmed || null;
}


// VALIDATION
export function isValidCategoryId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
}

export function validateCategoryPayload(
  body: unknown,
):
  | { ok: true; value: CategoryWriteInput }
  | { ok: false; message: string } {

  if (!isRecord(body)) {
    return {
      ok: false,
      message: "A valid category object is required.",
    };
  }

  const name =
    typeof body.name === "string"
      ? body.name.trim()
      : "";

  const slug =
    typeof body.slug === "string"
      ? body.slug.trim()
      : "";

  const description = optionalText(
    body.description,
    2000,
  );

  const imageUrl = optionalText(
    body.image_url,
    2048,
  );

  const isActive =
    body.is_active === undefined
      ? true
      : body.is_active;

  const sortOrder =
    body.sort_order === undefined
      ? 0
      : body.sort_order;

  // Name validation

  if (!name || name.length > 100) {
    return {
      ok: false,
      message:
        "Category name is required and must not exceed 100 characters.",
    };
  }

  // Slug validation

  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    slug.length > 120
  ) {
    return {
      ok: false,
      message:
        "Slug must contain lowercase letters, numbers and single hyphens.",
    };
  }

  // Description validation

  if (description === undefined) {
    return {
      ok: false,
      message: "Description must be valid text.",
    };
  }

  // Image validation

  if (imageUrl === undefined) {
    return {
      ok: false,
      message: "Image URL must be valid text.",
    };
  }

  if (imageUrl !== null) {
    const isLocalPath =
      imageUrl.startsWith("/") &&
      !imageUrl.startsWith("//") &&
      !imageUrl.includes("\\") &&
      !imageUrl.includes("\0");

    let isHttpsUrl = false;

    try {
      const parsedUrl = new URL(imageUrl);

      isHttpsUrl =
        parsedUrl.protocol === "https:" &&
        parsedUrl.username === "" &&
        parsedUrl.password === "";
    } catch {
      // Only valid local paths are accepted otherwise.
    }

    if (!isLocalPath && !isHttpsUrl) {
      return {
        ok: false,
        message:
          "Image must be a safe local path or an HTTPS URL.",
      };
    }
  }

  // Active status validation

  if (typeof isActive !== "boolean") {
    return {
      ok: false,
      message: "Invalid category active status.",
    };
  }

  // Sort order validation

  if (
    typeof sortOrder !== "number" ||
    !Number.isSafeInteger(sortOrder) ||
    sortOrder < 0 ||
    sortOrder > 999999
  ) {
    return {
      ok: false,
      message:
        "Sort order must be a non-negative integer.",
    };
  }

  return {
    ok: true,
    value: {
      name,
      slug,
      description,
      image_url: imageUrl,
      is_active: isActive,
      sort_order: sortOrder,
    },
  };
}

// DATABASE ERROR
export function getDatabaseErrorCode(
  error: unknown,
): string | null {
  if (!isRecord(error)) {
    return null;
  }

  return typeof error.code === "string"
    ? error.code
    : null;
}

// GET ALL CATEGORIES
export async function findAllAdminCategories(): Promise<
  AdminCategory[]
> {
  const result = await getPool().query<AdminCategoryRow>(
    `
      ${CATEGORY_SELECT}
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC
    `,
  );

  return result.rows.map(serializeCategory);
}

// GET CATEGORY BY ID
export async function findAdminCategoryById(
  id: string,
): Promise<AdminCategory | null> {

  if (!isValidCategoryId(id)) {
    return null;
  }

  const result = await getPool().query<AdminCategoryRow>(
    `
      ${CATEGORY_SELECT}
      WHERE c.id = $1::uuid
      GROUP BY c.id
    `,
    [id],
  );

  if (!result.rows[0]) {
    return null;
  }

  return serializeCategory(result.rows[0]);
}


// CREATE CATEGORY
export async function createAdminCategory(
  input: CategoryWriteInput,
): Promise<AdminCategory> {

  const result = await getPool().query<{ id: string }>(
    `
      INSERT INTO public.categories (
        name,
        slug,
        description,
        image_url,
        is_active,
        sort_order
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
    [
      input.name,
      input.slug,
      input.description,
      input.image_url,
      input.is_active,
      input.sort_order,
    ],
  );

  const category = await findAdminCategoryById(
    result.rows[0].id,
  );

  if (!category) {
    throw new Error(
      "Created category could not be retrieved.",
    );
  }

  return category;
}

// UPDATE CATEGORY
export async function updateAdminCategory(
  id: string,
  input: CategoryWriteInput,
): Promise<AdminCategory | null> {

  if (!isValidCategoryId(id)) {
    return null;
  }

  const result = await getPool().query<{ id: string }>(
    `
      UPDATE public.categories
      SET
        name = $1,
        slug = $2,
        description = $3,
        image_url = $4,
        is_active = $5,
        sort_order = $6,
        updated_at = NOW()
      WHERE id = $7::uuid
      RETURNING id
    `,
    [
      input.name,
      input.slug,
      input.description,
      input.image_url,
      input.is_active,
      input.sort_order,
      id,
    ],
  );

  if (!result.rows[0]) {
    return null;
  }

  return findAdminCategoryById(id);
}


// DELETE CATEGORY
export async function deleteAdminCategory(
  id: string,
): Promise<boolean> {

  if (!isValidCategoryId(id)) {
    return false;
  }

  // The foreign key ON DELETE RESTRICT protects categories
  // that are still associated with products.

  const result = await getPool().query(
    `
      DELETE FROM public.categories
      WHERE id = $1::uuid
    `,
    [id],
  );

  return result.rowCount === 1;
}
