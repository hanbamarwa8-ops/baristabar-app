import { getPool } from "@/lib/db";

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

/**
 * Return active storefront categories in their configured display order.
 * This module is intended for server-side use only.
 */
export async function findActiveCategories(): Promise<CategoryRecord[]> {
  const result = await getPool().query<CategoryRecord>(`
    SELECT
      id,
      name,
      slug,
      description,
      image_url,
      is_active,
      sort_order
    FROM public.categories
    WHERE is_active = TRUE
    ORDER BY sort_order ASC, name ASC
  `);

  return result.rows.map((category) => ({
    ...category,
    id: String(category.id),
    name: String(category.name),
    slug: String(category.slug),
    description:
      typeof category.description === "string" ? category.description : null,
    image_url:
      typeof category.image_url === "string" && category.image_url.trim()
        ? category.image_url.trim()
        : null,
    is_active: Boolean(category.is_active),
    sort_order: Number(category.sort_order) || 0,
  }));
}