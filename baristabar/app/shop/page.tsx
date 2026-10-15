import Image from "next/image";

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

  const result =
    (await response.json()) as ProductsApiResponse;

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
      <main className="min-h-screen bg-[#F8F5F0] px-6 py-20">
        <h1 className="font-serif text-4xl text-[#3B2418]">
          Our Coffee Collection
        </h1>

        <p className="mt-6 text-sm text-red-700">
          Impossible de charger les produits. Vérifie que le backend Express
          est démarré.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F5F0] px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
      <div className="mx-auto max-w-310">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8A6B55]">
          Explore our collection
        </p>

        <h1 className="mt-4 font-serif text-4xl text-[#3B2418] sm:text-6xl">
          Our Coffee Collection
        </h1>

        <p className="mt-5 max-w-xl text-sm leading-7 text-stone-600 sm:text-base">
          Discover carefully selected coffees for your everyday ritual.
        </p>

        {products.length === 0 ? (
          <p className="mt-12 text-stone-600">
            No coffees available at the moment.
          </p>
        ) : (
          <div className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <article key={product.id} className="group">
                <div className="relative aspect-4/5 overflow-hidden rounded-xl bg-[#F0E8DE]">
                  <Image
                    src={product.image_url ?? "/coffee-origins.jpg"}
                    alt={product.name}
                    fill
                    sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  <span className="absolute left-4 top-4 rounded-full bg-[#F8F2EB] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#3B2418]">
                    {product.category}
                  </span>
                </div>

                <div className="pt-5">
                  <h2 className="font-serif text-2xl text-[#3B2418]">
                    {product.name}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-stone-500">
                    {product.description ?? "Discover our specialty coffee."}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#3B2418]">
                      {product.price.toFixed(3)} TND
                    </p>

                    <p className="text-xs text-stone-500">
                      {product.stock > 0
                        ? "In stock"
                        : "Out of stock"}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
