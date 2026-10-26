import { findActiveProducts } from "@/lib/products-repository";
 export interface Product {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    category: string;
    image_url: string | null;
    stock: number;
    created_at?: string;
  }
  

  
  const fallbackImagesBySlug: Record<string, string> = {
    "ethiopia-yirgacheffe": "/01_Ethiopia_Yirgacheffe_v2.png",
    "house-espresso-blend": "/02_House_Espresso_Blend_v2.png",
    "colombia-supremo": "/03_Colombia_Supremo_v2.png",
    "brazilian-signature-blend": "/05_Brazilian_Signature_Blend_v2.png",
    "tunisian-coffee-blend": "/06_Tunisian_Coffee_Blend_v2.png",
    "brazilian-santos": "/04_Brazilian_Santos.png",
  };
  

  export async function getProductsFromDatabase(): Promise<Product[]> {
    const rows = await findActiveProducts();
  
    return rows.map((raw) => ({
      id: String(raw.id),
      name: String(raw.name),
      slug: String(raw.slug),
      description:
        typeof raw.description === "string" ? raw.description : null,
      price: Number(raw.price),
      category: String(raw.category),
      image_url:
        typeof raw.image_url === "string" && raw.image_url.trim()
          ? raw.image_url.trim()
          : null,
      stock: Math.max(0, Math.trunc(Number(raw.stock))),
      created_at: raw.created_at
        ? (
            raw.created_at instanceof Date
              ? raw.created_at
              : new Date(raw.created_at)
          ).toISOString()
        : undefined,
    }));
  }

  export function getProductImage(
    product: Pick<Product, "slug" | "image_url">
  ): string {
    return (
      product.image_url ||
      fallbackImagesBySlug[product.slug] ||
      "/coffee-origins.jpg"
    );
  }
  