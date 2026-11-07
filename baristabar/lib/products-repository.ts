import { getPool } from "@/lib/db";

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string | number;
  category: string;
  category_id: string | null;
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
      category_id,
      image_url,
      stock,
      created_at
    FROM public.products
    WHERE is_active = TRUE
    ORDER BY created_at DESC
  `);

  return result.rows.map((product) => ({
    ...product,
    id: String(product.id),
    category_id: product.category_id
      ? String(product.category_id)
      : null,
    price: Number(product.price),
    stock: Math.max(0, Math.trunc(Number(product.stock))),
  }));
}