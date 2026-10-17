export interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  stock: number;
}

function createDemoProduct(
  slug: string,
  name: string,
  category: string,
  image_url: string,
  price: number,
  description: string,
  stock = 10
): CatalogProduct {
  return {
    id: `demo-${slug}`,
    name,
    slug,
    category,
    image_url,
    price,
    description,
    stock,
  };
}

export const demoProducts: CatalogProduct[] = [
  // 01 — COFFEE BEANS
  createDemoProduct(
    "ethiopia-yirgacheffe",
    "Ethiopia Yirgacheffe",
    "Coffee Beans",
    "/01_Ethiopia_Yirgacheffe_v2.png",
    32.9,
    "Un café de spécialité aux arômes délicats et floraux.",
    15
  ),
  createDemoProduct(
    "house-espresso-blend",
    "House Espresso Blend",
    "Coffee Beans",
    "/02_House_Espresso_Blend_v2.png",
    28.9,
    "Un assemblage équilibré pour un espresso généreux.",
    20
  ),
  createDemoProduct(
    "colombia-supremo",
    "Colombia Supremo",
    "Coffee Beans",
    "/03_Colombia_Supremo_v2.png",
    35.9,
    "Un café colombien aux notes douces et équilibrées.",
    12
  ),
  createDemoProduct(
    "brazilian-santos",
    "Brazilian Santos",
    "Coffee Beans",
    "/04_Brazilian_Santos.png",
    31.9,
    "Un café brésilien doux aux arômes gourmands.",
    15
  ),
  createDemoProduct(
    "brazilian-signature-blend",
    "Brazilian Signature Blend",
    "Coffee Beans",
    "/05_Brazilian_Signature_Blend_v2.png",
    39,
    "Un assemblage signature aux arômes généreux."
  ),
  createDemoProduct(
    "tunisian-coffee-blend",
    "Tunisian Coffee Blend",
    "Coffee Beans",
    "/06_Tunisian_Coffee_Blend_v2.png",
    29,
    "Un mélange inspiré des saveurs du café tunisien."
  ),
  createDemoProduct(
    "lavazza-qualita-oro",
    "Lavazza Qualità Oro",
    "Coffee Beans",
    "/01_Lavazza_Qualita_Oro.png",
    42.9,
    "Un café aux notes aromatiques et raffinées."
  ),
  createDemoProduct(
    "lavazza-qualita-rossa",
    "Lavazza Qualità Rossa",
    "Coffee Beans",
    "/02_Lavazza_Qualita_Rossa_v2.png",
    34.9,
    "Un assemblage classique au caractère intense."
  ),
  createDemoProduct(
    "lavazza-super-crema",
    "Lavazza Super Crema",
    "Coffee Beans",
    "/03_Lavazza_Super_Crema.png",
    45.9,
    "Un assemblage conçu pour une crema onctueuse."
  ),

  // 02 — GROUND COFFEE
  createDemoProduct(
    "cafe-turc-premium",
    "Café Turc Premium",
    "Ground Coffee",
    "/05_Cafe_Turc_Premium.png",
    24.9,
    "Un café moulu inspiré de la tradition du café turc."
  ),
  createDemoProduct(
    "lavazza-qualita-rossa-250g",
    "Lavazza Qualità Rossa 250g",
    "Ground Coffee",
    "/09_Lavazza_Qualita_Rossa_250g.png",
    18.9,
    "Café moulu pour les préparations du quotidien.",
    20
  ),
  createDemoProduct(
    "illy-classico",
    "Illy Classico",
    "Ground Coffee",
    "/14_Illy_Classico.png",
    39.9,
    "Un café classique aux arômes équilibrés."
  ),

  // 03 — COFFEE CAPSULES
  createDemoProduct(
    "nespresso-original-volluto",
    "Nespresso Original Volluto",
    "Coffee Capsules",
    "/08_Nespresso_Original_Volluto.png",
    22.9,
    "Des capsules pour préparer un espresso aromatique.",
    15
  ),
  createDemoProduct(
    "lavazza-rossa-capsules",
    "Lavazza Rossa Capsules",
    "Coffee Capsules",
    "/10_Lavazza_Rossa_Capsules.png",
    19.9,
    "Des capsules pratiques pour le café quotidien.",
    15
  ),
  createDemoProduct(
    "lavazza-espresso-maestro",
    "Lavazza Espresso Maestro",
    "Coffee Capsules",
    "/13_Lavazza_Espresso_Maestro.png",
    37.9,
    "Une référence de café pour les amateurs d'espresso."
  ),

  // 04 — SYRUPS & FLAVOURS
  createDemoProduct(
    "monin-hazelnut",
    "Monin Hazelnut",
    "Syrups & Flavours",
    "/04_Monin_Hazelnut.png",
    16.9,
    "Un sirop à la noisette pour personnaliser tes boissons."
  ),
  createDemoProduct(
    "monin-caramel",
    "Monin Caramel",
    "Syrups & Flavours",
    "/05_Monin_Caramel.png",
    16.9,
    "Une saveur caramel pour des cafés gourmands."
  ),
  createDemoProduct(
    "monin-vanilla",
    "Monin Vanilla",
    "Syrups & Flavours",
    "/06_Monin_Vanilla.png",
    16.9,
    "Un sirop à la vanille pour tes boissons préférées."
  ),

  // 05 — ACCESSORIES
  createDemoProduct(
    "hario-v60-paper-filters",
    "Hario V60 Paper Filters",
    "Accessories",
    "/01_Hario_V60_Paper_Filters.png",
    12.9,
    "Des filtres papier pour préparer du café filtre.",
    20
  ),
  createDemoProduct(
    "bodum-chambord-french-press",
    "Bodum Chambord French Press",
    "Accessories",
    "/04_Bodum_Chambord_French_Press.png",
    89.9,
    "Une cafetière à piston pour préparer du café.",
    8
  ),
  createDemoProduct(
    "manual-coffee-grinder",
    "Manual Coffee Grinder",
    "Accessories",
    "/07_Manual_Coffee_Grinder.png",
    54.9,
    "Un moulin manuel pour moudre le café à la demande.",
    8
  ),
  createDemoProduct(
    "pavina-espresso-glasses",
    "Pavina Espresso Glasses",
    "Accessories",
    "/11_Pavina_Espresso_Glasses.png",
    32.9,
    "Des verres pour présenter tes expressos."
  ),
  createDemoProduct(
    "capsule-dispenser",
    "Coffee Capsule Dispenser",
    "Accessories",
    "/capsule-dispenser.jpg",
    39.9,
    "Un accessoire pour organiser les capsules de café."
  ),
  createDemoProduct(
    "coffee-spoons",
    "Coffee Spoons",
    "Accessories",
    "/coffee-spoons.jpg",
    14.9,
    "Des cuillères pour servir et préparer le café."
  ),
  createDemoProduct(
    "espresso-cups",
    "Espresso Cups",
    "Accessories",
    "/espresso-cups.jpg",
    29.9,
    "Des tasses pour servir les expressos."
  ),
  createDemoProduct(
    "hario-v60-brewing",
    "Hario V60 Brewing Accessory",
    "Accessories",
    "/hario-v60-brewing.jpg",
    24.9,
    "Un accessoire dédié à la préparation du café filtre."
  ),
  createDemoProduct(
    "ice-cube-tray",
    "Ice Cube Tray",
    "Accessories",
    "/ice-cube-tray.jpg",
    12.9,
    "Un accessoire pour préparer des boissons glacées."
  ),
  createDemoProduct(
    "latte-glass",
    "Latte Glass",
    "Accessories",
    "/latte-glass.jpg",
    19.9,
    "Un verre pour servir les boissons à base de café."
  ),
  createDemoProduct(
    "milk-frother",
    "Milk Frother",
    "Accessories",
    "/milk-frother.jpg",
    59.9,
    "Un appareil pour préparer une mousse de lait."
  ),
  createDemoProduct(
    "red-coffee-cup",
    "Coffee Cup",
    "Accessories",
    "/red-coffee-cup.jpg",
    18.9,
    "Une tasse pour savourer tes boissons chaudes."
  ),
  createDemoProduct(
    "travel-mug",
    "Travel Mug",
    "Accessories",
    "/travel-mug.jpg",
    34.9,
    "Un mug pour emporter le café en déplacement."
  ),

  // 06 — COFFEE MACHINES
  createDemoProduct(
    "delonghi-essenza-mini",
    "DeLonghi Essenza Mini",
    "Coffee Machines",
    "/02_DeLonghi_Essenza_Mini.png",
    349,
    "Une machine compacte pour préparer des expressos.",
    4
  ),
  createDemoProduct(
    "delonghi-dedica-white",
    "DeLonghi Dedica White",
    "Coffee Machines",
    "/03_DeLonghi_Dedica_White.png",
    599,
    "Une machine espresso au design compact.",
    3
  ),

  // 07 — GIFT BOXES
  createDemoProduct(
    "nespresso-volluto-set",
    "Nespresso Volluto Set",
    "Gift Boxes",
    "/12_Nespresso_Volluto_Set.png",
    49.9,
    "Un coffret autour du café Nespresso Volluto.",
    6
  ),
];