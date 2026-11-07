import { getPool } from "@/lib/db";


// TYPES
export interface ProductWriteInput {
  name: string;
  slug: string;
  description: string | null;
  price: number;
  category: string;
  category_id: string | null;
  image_url: string | null;
  stock: number;
  is_active: boolean;
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  category: string;
  category_id: string | null;
  image_url: string | null;
  stock: number;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string | null;
}

interface AdminProductRow extends Omit<AdminProduct, "price" | "stock"> {
  price: number | string;
  stock: number | string;
}

export interface DeletedAdminProduct {
  id: string;
  image_url: string | null;
}

// ERRORS
export class ProductCategoryNotFoundError extends Error {
  readonly code = "BARISTABAR_CATEGORY_NOT_FOUND";

  constructor() {
    super("The selected product category does not exist.");
    this.name = "ProductCategoryNotFoundError";
  }
}

// SQL COLUMNS
const RETURNING_COLUMNS = `
  id,
  name,
  slug,
  description,
  price,
  category,
  category_id,
  image_url,
  stock,
  is_active,
  created_at,
  updated_at
`;


// HELPERS
function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function serializeProduct(product: AdminProductRow): AdminProduct {
  return {
    ...product,
    price: Number(product.price),
    stock: Number(product.stock),
  };
}

function optionalText(
  value: unknown,
  maxLength = 5000,
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

// PRODUCT VALIDATION
export function validateProductPayload(
  body: unknown,
):
  | { ok: true; value: ProductWriteInput }
  | { ok: false; message: string } {

  if (!isRecord(body)) {
    return {
      ok: false,
      message: "A valid product object is required.",
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

  const category =
    typeof body.category === "string"
      ? body.category.trim()
      : "";

  const price =
    typeof body.price === "number"
      ? body.price
      : typeof body.price === "string" &&
          body.price.trim() !== ""
        ? Number(body.price)
        : Number.NaN;

  const stock =
    typeof body.stock === "number"
      ? body.stock
      : typeof body.stock === "string" &&
          body.stock.trim() !== ""
        ? Number(body.stock)
        : Number.NaN;

  const description = optionalText(body.description, 5000);
  const imageUrl = optionalText(body.image_url, 2048);

  const categoryId =
    body.category_id === undefined ||
    body.category_id === null ||
    body.category_id === ""
      ? null
      : typeof body.category_id === "string"
        ? body.category_id.trim()
        : undefined;

  // Name

  if (!name || name.length > 150) {
    return {
      ok: false,
      message: "Name is required and must be at most 150 characters.",
    };
  }

  // Slug

  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    slug.length > 180
  ) {
    return {
      ok: false,
      message: "Slug must use lowercase letters, numbers and single hyphens only.",
    };
  }

  // Category compatibility

  if (!category && !categoryId) {
    return {
      ok: false,
      message: "A product category is required.",
    };
  }

  if (category.length > 100) {
    return {
      ok: false,
      message: "Category must be at most 100 characters.",
    };
  }

  // Category UUID

  if (
    categoryId !== null &&
    (
      categoryId === undefined ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        categoryId,
      )
    )
  ) {
    return {
      ok: false,
      message: "A valid category ID is required.",
    };
  }

  // Price

  if (
    !Number.isFinite(price) ||
    price < 0 ||
    price > 9_999_999.999 ||
    Math.abs(price * 1000 - Math.round(price * 1000)) > 1e-7
  ) {
    return {
      ok: false,
      message: "Price must be non-negative with at most 3 decimal places.",
    };
  }

  // Stock

  if (
    !Number.isInteger(stock) ||
    stock < 0 ||
    stock > 2_147_483_647
  ) {
    return {
      ok: false,
      message: "Stock must be a non-negative whole number.",
    };
  }

  // Description

  if (description === undefined) {
    return {
      ok: false,
      message: "Description must be text or empty.",
    };
  }

  // Image

  if (imageUrl === undefined) {
    return {
      ok: false,
      message: "Image path must be text or empty.",
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
      // Only safe local paths are accepted otherwise.
    }

    if (!isLocalPath && !isHttpsUrl) {
      return {
        ok: false,
        message: "Image path must be a local path or a valid HTTPS URL.",
      };
    }
  }

  // Active status

  if (typeof body.is_active !== "boolean") {
    return {
      ok: false,
      message: "Product active status must be true or false.",
    };
  }

  return {
    ok: true,
    value: {
      name,
      slug,
      description,
      price: Number(price.toFixed(3)),
      category,
      category_id: categoryId ?? null,
      image_url: imageUrl,
      stock,
      is_active: body.is_active,
    },
  };
}

// PRODUCT ID VALIDATION
export function isValidProductId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
}

// DATABASE ERROR
export function getDatabaseErrorCode(
  error: unknown,
): string | null {
  if (!isRecord(error) || typeof error.code !== "string") {
    return null;
  }

  return error.code;
}

// FIND ALL ADMIN PRODUCTS
export async function findAllAdminProducts(): Promise<AdminProduct[]> {
  const result = await getPool().query<AdminProductRow>(`
    SELECT
      p.id,
      p.name,
      p.slug,
      p.description,
      p.price,
      COALESCE(c.name, p.category) AS category,
      p.category_id,
      p.image_url,
      p.stock,
      p.is_active,
      p.created_at,
      p.updated_at
    FROM public.products AS p
    LEFT JOIN public.categories AS c
      ON c.id = p.category_id
    ORDER BY p.created_at DESC
  `);

  return result.rows.map(serializeProduct);
}

// CREATE ADMIN PRODUCT
// Resolves the category using category_id or legacy category name.
export async function createAdminProduct(
  input: ProductWriteInput,
): Promise<AdminProduct> {
  const result = await getPool().query<AdminProductRow>(
    `
      INSERT INTO public.products (
        name,
        slug,
        description,
        price,
        category,
        image_url,
        stock,
        is_active,
        category_id
      )
      SELECT
        $1,
        $2,
        $3,
        $4,
        c.name,
        $5,
        $6,
        $7,
        c.id
      FROM public.categories AS c
      WHERE
        (
          $8::uuid IS NOT NULL
          AND c.id = $8::uuid
        )
        OR
        (
          $8::uuid IS NULL
          AND (
            LOWER(BTRIM(c.name)) = LOWER(BTRIM($9))
            OR LOWER(c.slug) = LOWER(BTRIM($9))
          )
        )
      ORDER BY c.sort_order ASC
      LIMIT 1
      RETURNING ${RETURNING_COLUMNS}
    `,
    [
      input.name,
      input.slug,
      input.description,
      input.price,
      input.image_url,
      input.stock,
      input.is_active,
      input.category_id,
      input.category,
    ],
  );

  if (!result.rows[0]) {
    throw new ProductCategoryNotFoundError();
  }

  return serializeProduct(result.rows[0]);
}

// UPDATE ADMIN PRODUCT
// Updates both the category text and category_id.
export async function updateAdminProduct(
  id: string,
  input: ProductWriteInput,
): Promise<AdminProduct | null> {
  const pool = getPool();

  const result = await pool.query<AdminProductRow>(
    `
      UPDATE public.products AS p
      SET
        name = $1,
        slug = $2,
        description = $3,
        price = $4,
        category = c.name,
        image_url = $5,
        stock = $6,
        is_active = $7,
        category_id = c.id,
        updated_at = NOW()
      FROM public.categories AS c
      WHERE
        p.id = $8::uuid
        AND (
          (
            $9::uuid IS NOT NULL
            AND c.id = $9::uuid
          )
          OR
          (
            $9::uuid IS NULL
            AND (
              LOWER(BTRIM(c.name)) = LOWER(BTRIM($10))
              OR LOWER(c.slug) = LOWER(BTRIM($10))
            )
          )
        )
      RETURNING
        p.id,
        p.name,
        p.slug,
        p.description,
        p.price,
        p.category,
        p.category_id,
        p.image_url,
        p.stock,
        p.is_active,
        p.created_at,
        p.updated_at
    `,
    [
      input.name,
      input.slug,
      input.description,
      input.price,
      input.image_url,
      input.stock,
      input.is_active,
      id,
      input.category_id,
      input.category,
    ],
  );

  if (result.rows[0]) {
    return serializeProduct(result.rows[0]);
  }

  // Distinguish an unknown product from an unknown category.

  const existingProduct = await pool.query<{ id: string }>(
    `
      SELECT id
      FROM public.products
      WHERE id = $1::uuid
    `,
    [id],
  );

  if (existingProduct.rows.length > 0) {
    throw new ProductCategoryNotFoundError();
  }

  return null;
}

// ACTIVATE / DEACTIVATE PRODUCT
export async function updateProductActiveStatus(
  id: string,
  isActive: boolean,
): Promise<AdminProduct | null> {
  const result = await getPool().query<AdminProductRow>(
    `
      UPDATE public.products
      SET
        is_active = $1,
        updated_at = NOW()
      WHERE id = $2::uuid
      RETURNING ${RETURNING_COLUMNS}
    `,
    [isActive, id],
  );

  return result.rows[0]
    ? serializeProduct(result.rows[0])
    : null;
}

// DELETE PRODUCT
// The database foreign key protects historical order_items.
// If an order references this product, PostgreSQL rejects deletion.
export async function deleteAdminProduct(
  id: string,
): Promise<DeletedAdminProduct | null> {
  const result = await getPool().query<DeletedAdminProduct>(
    `
      DELETE FROM public.products
      WHERE id = $1::uuid
      RETURNING id, image_url
    `,
    [id],
  );

  return result.rows[0] ?? null;
}
