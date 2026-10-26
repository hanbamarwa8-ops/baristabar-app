import { getPool } from "@/lib/db";

export interface ProductWriteInput {
  name: string;
  slug: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  stock: number;
  is_active: boolean;
}

interface AdminProductRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | string;
  category: string;
  image_url: string | null;
  stock: number;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string | null;
}

const SELECT_COLUMNS = `
  id,
  name,
  slug,
  description,
  price,
  category,
  image_url,
  stock,
  is_active,
  created_at,
  updated_at
`;

function serializeProduct(product: AdminProductRow) {
  return {
    ...product,
    price: Number(product.price),
    stock: Number(product.stock),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalText(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (trimmed.length > 5000) return undefined;

  return trimmed || null;
}

export function validateProductPayload(
  body: unknown,
):
  | { ok: true; value: ProductWriteInput }
  | { ok: false; message: string } {
  if (!isRecord(body)) {
    return { ok: false, message: "A valid product object is required." };
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const category =
    typeof body.category === "string" ? body.category.trim() : "";

  const price =
    typeof body.price === "number"
      ? body.price
      : typeof body.price === "string" && body.price.trim() !== ""
        ? Number(body.price)
        : Number.NaN;

  const stock =
    typeof body.stock === "number"
      ? body.stock
      : typeof body.stock === "string" && body.stock.trim() !== ""
        ? Number(body.stock)
        : Number.NaN;

  const description = optionalText(body.description);
  const imageUrl = optionalText(body.image_url);

  if (!name || name.length > 150) {
    return {
      ok: false,
      message: "Name is required and must be at most 150 characters.",
    };
  }

  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    slug.length > 180
  ) {
    return {
      ok: false,
      message: "Slug must use lowercase letters, numbers and single hyphens only.",
    };
  }

  if (!category || category.length > 100) {
    return {
      ok: false,
      message: "Category is required and must be at most 100 characters.",
    };
  }

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

  if (description === undefined) {
    return { ok: false, message: "Description must be text or empty." };
  }

  if (imageUrl === undefined) {
    return { ok: false, message: "Image path must be text or empty." };
  }

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
      image_url: imageUrl,
      stock,
      is_active: body.is_active,
    },
  };
}

export function isValidProductId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
}

export function getDatabaseErrorCode(error: unknown): string | null {
  if (!isRecord(error) || typeof error.code !== "string") return null;
  return error.code;
}

export async function findAllAdminProducts() {
  const result = await getPool().query<AdminProductRow>(`
    SELECT ${SELECT_COLUMNS}
    FROM public.products
    ORDER BY created_at DESC
  `);

  return result.rows.map(serializeProduct);
}

export async function createAdminProduct(input: ProductWriteInput) {
  const result = await getPool().query<AdminProductRow>(
    `
      INSERT INTO public.products (
        name, slug, description, price, category, image_url, stock, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING ${SELECT_COLUMNS}
    `,
    [
      input.name,
      input.slug,
      input.description,
      input.price,
      input.category,
      input.image_url,
      input.stock,
      input.is_active,
    ],
  );

  return serializeProduct(result.rows[0]);
}

export async function updateAdminProduct(
  id: string,
  input: ProductWriteInput,
) {
  const result = await getPool().query<AdminProductRow>(
    `
      UPDATE public.products
      SET
        name = $1,
        slug = $2,
        description = $3,
        price = $4,
        category = $5,
        image_url = $6,
        stock = $7,
        is_active = $8,
        updated_at = NOW()
      WHERE id = $9
      RETURNING ${SELECT_COLUMNS}
    `,
    [
      input.name,
      input.slug,
      input.description,
      input.price,
      input.category,
      input.image_url,
      input.stock,
      input.is_active,
      id,
    ],
  );

  return result.rows[0] ? serializeProduct(result.rows[0]) : null;
}

export async function updateProductActiveStatus(
  id: string,
  isActive: boolean,
) {
  const result = await getPool().query<AdminProductRow>(
    `
      UPDATE public.products
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING ${SELECT_COLUMNS}
    `,
    [isActive, id],
  );

  return result.rows[0] ? serializeProduct(result.rows[0]) : null;
}