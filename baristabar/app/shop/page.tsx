import { FeaturedProductCard } from "@/components/molecules/FeaturedProductCard";

export const dynamic = "force-dynamic";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  stock: number;
}

interface ProductsApiResponse {
  success: boolean;
  data: Product[];
}

const productImagesBySlug: Record<string, string> = {
  "ethiopia-yirgacheffe": "/01_Ethiopia_Yirgacheffe_v2.png",
  "house-espresso-blend": "/02_House_Espresso_Blend_v2.png",
  "colombia-supremo": "/03_Colombia_Supremo_v2.png",
  "brazilian-signature-blend": "/05_Brazilian_Signature_Blend_v2.png",
  "tunisian-coffee-blend": "/06_Tunisian_Coffee_Blend_v2.png",
};

const productImagesByName: Record<string, string> = {
  "ethiopia yirgacheffe": "/01_Ethiopia_Yirgacheffe_v2.png",
  "house espresso blend": "/02_House_Espresso_Blend_v2.png",
  "colombia supremo": "/03_Colombia_Supremo_v2.png",
  "brazilian signature blend": "/05_Brazilian_Signature_Blend_v2.png",
  "tunisian coffee blend": "/06_Tunisian_Coffee_Blend_v2.png",
};

function normalizeProductName(name: string): string {
  return name.trim().toLowerCase();
}

async function getProducts(): Promise<Product[]> {
  const backendUrl = process.env.BACKEND_URL;

  if (!backendUrl) {
    throw new Error("BACKEND_URL est manquante dans .env.local");
  }

  const response = await fetch(`${backendUrl}/api/products`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Erreur API : ${response.status}`);
  }

  const result = (await response.json()) as ProductsApiResponse;

  if (!result.success || !Array.isArray(result.data)) {
    throw new Error("Réponse API invalide");
  }

  return result.data;
}

export default async function ShopPage() {
  let products: Product[];

  try {
    products = await getProducts();
  } catch (error) {
    console.error("Impossible de charger la boutique :", error);

    return (
      <main className="min-h-screen bg-[#F8F5F0] px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-310">
          <h1 className="font-serif text-4xl text-[#3B2418]">
            Our Coffee Collection
          </h1>

          <p className="mt-6 text-sm text-red-700">
            Impossible de charger les produits. Vérifie que le backend
            Express est démarré.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F5F0] px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
      <div className="mx-auto max-w-310">
        {/* Page heading */}
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8A6B55]">
          Explore our collection
        </p>

        <h1 className="mt-4 font-serif text-4xl text-[#3B2418] sm:text-6xl">
          Our Coffee Collection
        </h1>

        <p className="mt-5 max-w-xl text-sm leading-7 text-stone-600 sm:text-base">
          Discover carefully selected coffees for your everyday ritual.
        </p>

        {/* Products */}
        {products.length === 0 ? (
          <p className="mt-12 text-stone-600">
            No coffees available at the moment.
          </p>
        ) : (
          <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 xl:gap-x-5">
            {products.map((product, index) => {
              const normalizedName = normalizeProductName(product.name);

              const image =
                productImagesBySlug[product.slug] ??
                productImagesByName[normalizedName] ??
                product.image_url ??
                "/coffee-origins.jpg";

              return (
                <FeaturedProductCard
                  key={product.id}
                  productId={product.id}
                  stock={product.stock}
                  name={product.name}
                  category={product.category}
                  description={
                    product.description ??
                    "Discover our specialty coffee."
                  }
                  price={product.price}
                  image={image}
                  href="/shop"
                  loading={index === 0 ? "eager" : "lazy"}
                />
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}