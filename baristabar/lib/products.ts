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
  
  interface ProductsApiResponse {
    success?: boolean;
    data?: unknown;
    message?: string;
  }
  
  const fallbackImagesBySlug: Record<string, string> = {
    "ethiopia-yirgacheffe": "/01_Ethiopia_Yirgacheffe_v2.png",
    "house-espresso-blend": "/02_House_Espresso_Blend_v2.png",
    "colombia-supremo": "/03_Colombia_Supremo_v2.png",
    "brazilian-signature-blend": "/05_Brazilian_Signature_Blend_v2.png",
    "tunisian-coffee-blend": "/06_Tunisian_Coffee_Blend_v2.png",
    "brazilian-santos": "/04_Brazilian_Santos.png",
  };
  
  function isProduct(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== "object") {
      return false;
    }
  
    const product = value as Record<string, unknown>;
  
    return (
      typeof product.id === "string" &&
      typeof product.name === "string" &&
      typeof product.slug === "string" &&
      typeof product.category === "string" &&
      Number.isFinite(Number(product.price)) &&
      Number.isFinite(Number(product.stock))
    );
  }
  
 
  export async function getProductsFromApi(): Promise<Product[]> {
    const backendUrl = process.env.BACKEND_URL?.replace(/\/+$/, "");
  
    if (!backendUrl) {
      throw new Error(
        "BACKEND_URL n'est pas configurée pour l'application client."
      );
    }
  
    let response: Response;
  
    try {
      response = await fetch(`${backendUrl}/api/products`, {
        cache: "no-store",
      });
    } catch {
      throw new Error(
        "Impossible de joindre l'API BaristaBar. Vérifie que le backend fonctionne."
      );
    }
  
    if (!response.ok) {
      throw new Error(
        `L'API BaristaBar a répondu avec le statut HTTP ${response.status}.`
      );
    }
  
    let result: ProductsApiResponse;
  
    try {
      result = (await response.json()) as ProductsApiResponse;
    } catch {
      throw new Error("L'API BaristaBar a retourné un JSON invalide.");
    }
  
    if (!result.success || !Array.isArray(result.data)) {
      throw new Error(
        result.message || "La réponse de l'API produits est invalide."
      );
    }
  
    return result.data.filter(isProduct).map((raw) => ({
      id: String(raw.id),
      name: String(raw.name),
      slug: String(raw.slug),
      description:
        typeof raw.description === "string"
          ? raw.description
          : null,
      price: Number(raw.price),
      category: String(raw.category),
      image_url:
        typeof raw.image_url === "string" && raw.image_url.trim()
          ? raw.image_url.trim()
          : null,
      stock: Math.max(0, Math.trunc(Number(raw.stock))),
      created_at:
        typeof raw.created_at === "string"
          ? raw.created_at
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
  