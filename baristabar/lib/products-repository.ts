import { getPool } from "@/lib/db";

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string | number;
  category: string;
  image_url: string | null;
  stock: number;
  created_at: Date | string;
}

export async function findActiveProducts() {
  const result = await getPool().query<ProductRow>(`
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