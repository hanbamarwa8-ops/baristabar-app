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
  stock: number | string;
  created_at: Date | string;
}

function parseProductPrice(value: string | number): number {
  const price = Number(value);

  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Invalid product price in database.");
  }

  return price;
}

function parseProductStock(value: number | string): number {
  const stock = Number(value);

  if (!Number.isSafeInteger(stock)) {
    throw new Error("Invalid product stock in database.");
  }

  return Math.max(0, stock);
}

export async function findActiveProducts() {
  const result = await getPool().query<ProductRow>(`
    SELECT
      id::text AS id,
      name,
      slug,
      description,
      price::text AS price,
      category,
      category_id::text AS category_id,
      image_url,
      stock,
      created_at
    FROM public.products
    WHERE is_active IS TRUE
    ORDER BY created_at DESC, id DESC
  `);

  return result.rows.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: parseProductPrice(product.price),
    category: product.category,
    category_id: product.category_id,
    image_url: product.image_url,
    stock: parseProductStock(product.stock),
    created_at: product.created_at,
  }));
}
