import { pool } from "../config/database.js";

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  category: string;
  image_url: string | null;
  stock: number;
  created_at: Date;
}

export async function findActiveProducts() {
  const result = await pool.query<ProductRow>(`
    SELECT
      id,
      name,
      slug,
      description,
      price,
      category,
      image_url,
      stock,
      created_at
    FROM products
    WHERE is_active = TRUE
    ORDER BY created_at DESC
  `);

  return result.rows.map((product) => ({
    ...product,
    price: Number(product.price),
  }));
}