import { pool } from "../config/database.js";

export interface AdminProductInput {
  name: string;
  slug: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  stock: number;
  is_active: boolean;
}

export interface AdminProductRow extends AdminProductInput {
  id: string;
  created_at: Date;
  updated_at: Date | null;
}

const productColumns = `
  id, name, slug, description, price, category,
  image_url, stock, is_active, created_at, updated_at
`;

export async function findAllProductsForAdmin(): Promise<AdminProductRow[]> {
  const result = await pool.query<AdminProductRow>(`
    SELECT ${productColumns}
    FROM products
    ORDER BY created_at DESC
  `);

  return result.rows.map((product) => ({
    ...product,
    price: Number(product.price),
    stock: Number(product.stock),
  }));
}

export async function createProduct(
  input: AdminProductInput,
): Promise<AdminProductRow> {
  const result = await pool.query<AdminProductRow>(
    `
      INSERT INTO products (
        name, slug, description, price, category,
        image_url, stock, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING ${productColumns}
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

  const product = result.rows[0];

  return {
    ...product,
    price: Number(product.price),
    stock: Number(product.stock),
  };
}

export async function updateProduct(
  id: string,
  input: AdminProductInput,
): Promise<AdminProductRow | null> {
  const result = await pool.query<AdminProductRow>(
    `
      UPDATE products
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
      RETURNING ${productColumns}
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

  const product = result.rows[0];
  if (!product) return null;

  return {
    ...product,
    price: Number(product.price),
    stock: Number(product.stock),
  };
}

export async function setProductActive(
  id: string,
  isActive: boolean,
): Promise<AdminProductRow | null> {
  const result = await pool.query<AdminProductRow>(
    `
      UPDATE products
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING ${productColumns}
    `,
    [isActive, id],
  );

  const product = result.rows[0];
  if (!product) return null;

  return {
    ...product,
    price: Number(product.price),
    stock: Number(product.stock),
  };
}
