
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

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number | string;
}

function parseSortOrder(value: number | string): number {
  const sortOrder = Number(value);

  if (!Number.isFinite(sortOrder)) {
    throw new Error("Invalid category sort_order in database.");
  }

  return sortOrder;
}

export async function findActiveCategories(): Promise<CategoryRecord[]> {
  const result = await getPool().query<CategoryRow>(`
    SELECT
      id::text AS id,
      name,
      slug,
      description,
      image_url,
      is_active,
      sort_order
    FROM public.categories
    WHERE is_active IS TRUE
    ORDER BY sort_order ASC, name ASC, id ASC
  `);

  return result.rows.map((category) => {
    if (
      typeof category.is_active !== "boolean" ||
      typeof category.name !== "string" ||
      typeof category.slug !== "string"
    ) {
      throw new Error("Invalid category data returned by database.");
    }

    return {
      id: String(category.id),
      name: category.name,
      slug: category.slug,
      description:
        typeof category.description === "string"
          ? category.description
          : null,
      image_url:
        typeof category.image_url === "string" &&
        category.image_url.trim().length > 0
          ? category.image_url.trim()
          : null,
      is_active: category.is_active,
      sort_order: parseSortOrder(category.sort_order),
    };
  });
}
