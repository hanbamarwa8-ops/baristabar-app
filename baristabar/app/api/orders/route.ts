import { NextResponse } from "next/server";
import type { PoolClient } from "pg";

import { getPool } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { TUNISIAN_LOCATIONS } from "@/lib/tunisia-locations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FEATURED_SLUGS = [
  "ethiopia-yirgacheffe",
  "house-espresso-blend",
  "colombia-supremo",
] as const;

const BOX_NAMES = {
  "discovery-box": "Discovery Box",
  "classic-box": "Classic Box",
  "barista-box": "Barista Box",
  "premium-box": "Premium Box",
} as const;

type BoxSlug = keyof typeof BOX_NAMES;

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: string;
  stock: number;
}

interface ProductRequest {
  type: "product";
  productId: string;
  quantity: number;
}

interface BeanBoxRequest {
  type: "beanbox";
  boxSlug: BoxSlug;
  componentSlugs?: string[];
  quantity: number;
}

type RequestedItem = ProductRequest | BeanBoxRequest;

interface CheckoutPayload {
  idempotencyKey: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  shippingGovernorate: string;
  shippingCity: string;
  shippingCityIsCustom: boolean;
  shippingPostalCode: string | null;
  shippingNotes: string | null;
  items: RequestedItem[];
}

interface OrderResponseRow {
  id: string;
  status: string;
  subtotal: string;
  delivery_fee: string;
  total: string;
  created_at: Date | string;
}

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function requiredText(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new ApiError(`The field '${field}' is required.`, 400);
  }

  const clean = value.trim();

  if (!clean || clean.length > maxLength) {
    throw new ApiError(`The field '${field}' is invalid.`, 400);
  }

  return clean;
}

function optionalText(
  value: unknown,
  field: string,
  maxLength: number,
): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (
    typeof value !== "string" ||
    value.trim().length > maxLength
  ) {
    throw new ApiError(`The field '${field}' is invalid.`, 400);
  }

  return value.trim() || null;
}

function parseQuantity(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 100
  ) {
    throw new ApiError(
      "Each item quantity must be an integer from 1 to 100.",
      400,
    );
  }

  return value;
}

function parsePayload(value: unknown): CheckoutPayload {
  if (!isRecord(value)) {
    throw new ApiError("A valid JSON object is required.", 400);
  }

  if (!isUuid(value.idempotencyKey)) {
    throw new ApiError(
      "A valid idempotencyKey UUID is required.",
      400,
    );
  }

  if (
    !Array.isArray(value.items) ||
    value.items.length < 1 ||
    value.items.length > 50
  ) {
    throw new ApiError(
      "The order must contain between 1 and 50 items.",
      400,
    );
  }

  const items: RequestedItem[] = value.items.map((rawItem) => {
    if (!isRecord(rawItem)) {
      throw new ApiError("An order item is invalid.", 400);
    }

    const quantity = parseQuantity(rawItem.quantity);

    if (rawItem.type === "product") {
      if (!isUuid(rawItem.productId)) {
        throw new ApiError("A product ID is invalid.", 400);
      }

      return {
        type: "product",
        productId: rawItem.productId,
        quantity,
      };
    }

    if (rawItem.type === "beanbox") {
      const boxSlug = rawItem.boxSlug;

      if (
        typeof boxSlug !== "string" ||
        !Object.prototype.hasOwnProperty.call(BOX_NAMES, boxSlug)
      ) {
        throw new ApiError("The BeanBox type is invalid.", 400);
      }

      let componentSlugs: string[] | undefined;

      if (rawItem.componentSlugs !== undefined) {
        if (
          !Array.isArray(rawItem.componentSlugs) ||
          rawItem.componentSlugs.some(
            (slug) =>
              typeof slug !== "string" ||
              slug.length > 180,
          )
        ) {
          throw new ApiError(
            "The BeanBox selection is invalid.",
            400,
          );
        }

        componentSlugs = rawItem.componentSlugs.map(
          (slug) => (slug as string).trim(),
        );
      }

      return {
        type: "beanbox",
        boxSlug: boxSlug as BoxSlug,
        componentSlugs,
        quantity,
      };
    }

    throw new ApiError("An order item type is invalid.", 400);
  });

  const customerName = requiredText(
    value.customerName,
    "customerName",
    150,
  );

  const customerPhone = requiredText(
    value.customerPhone,
    "customerPhone",
    8,
  );

  if (!/^[0-9]{8}$/.test(customerPhone)) {
    throw new ApiError(
      "GSM must contain exactly 8 digits.",
      400,
    );
  }

  const shippingAddress = requiredText(
    value.shippingAddress,
    "shippingAddress",
    1000,
  );

  const shippingGovernorate = requiredText(
    value.shippingGovernorate,
    "shippingGovernorate",
    120,
  );

  if (
    !Object.prototype.hasOwnProperty.call(
      TUNISIAN_LOCATIONS,
      shippingGovernorate,
    )
  ) {
    throw new ApiError(
      "Choose a valid Tunisian governorate.",
      400,
    );
  }

  const shippingCity = requiredText(
    value.shippingCity,
    "shippingCity",
    120,
  );

  if (typeof value.shippingCityIsCustom !== "boolean") {
    throw new ApiError(
      "The locality selection is invalid.",
      400,
    );
  }

  const shippingCityIsCustom = value.shippingCityIsCustom;
  const knownTowns = TUNISIAN_LOCATIONS[shippingGovernorate];

  if (
    !shippingCityIsCustom &&
    !knownTowns.includes(shippingCity)
  ) {
    throw new ApiError(
      "Choose a locality belonging to the selected governorate.",
      400,
    );
  }

  const shippingPostalCode = optionalText(
    value.shippingPostalCode,
    "shippingPostalCode",
    4,
  );

  if (
    shippingPostalCode !== null &&
    !/^[0-9]{4}$/.test(shippingPostalCode)
  ) {
    throw new ApiError(
      "Postal code must contain exactly 4 digits.",
      400,
    );
  }

  return {
    idempotencyKey: value.idempotencyKey,
    customerName,
    customerPhone,
    shippingAddress,
    shippingGovernorate,
    shippingCity,
    shippingCityIsCustom,
    shippingPostalCode,
    shippingNotes: optionalText(
      value.shippingNotes,
      "shippingNotes",
      2000,
    ),
    items,
  };
}

// NUMERIC(10,3) is handled as integer thousandths to avoid floating-point totals.
function decimalToMills(value: string | number): number {
  const text = String(value).trim();
  const match = /^(\d+)(?:\.(\d{1,3}))?$/.exec(text);

  if (!match) {
    throw new ApiError(
      "A stored price or delivery fee is invalid.",
      500,
    );
  }

  const whole = Number(match[1]);
  const fraction = Number(
    (match[2] ?? "").padEnd(3, "0"),
  );

  const mills = whole * 1000 + fraction;

  if (!Number.isSafeInteger(mills)) {
    throw new ApiError(
      "A price is outside the supported range.",
      500,
    );
  }

  return mills;
}

function millsToDecimal(mills: number): string {
  return (mills / 1000).toFixed(3);
}

function isFeatured(slug: string): boolean {
  return (FEATURED_SLUGS as readonly string[]).includes(slug);
}

function isAccessory(category: string): boolean {
  return category.toLowerCase().includes("accessor");
}

function isFlavour(category: string): boolean {
  const normalized = category.toLowerCase();

  return (
    normalized.includes("syrup") ||
    normalized.includes("flavour") ||
    normalized.includes("flavor")
  );
}

function validateBoxSelection(
  boxSlug: BoxSlug,
  componentSlugs: string[] | undefined,
): string[] {
  if (boxSlug === "discovery-box") {
    return [...FEATURED_SLUGS];
  }

  if (
    !componentSlugs ||
    componentSlugs.some((slug) => !slug)
  ) {
    throw new ApiError(
      "Choose all products included in the BeanBox.",
      400,
    );
  }

  if (new Set(componentSlugs).size !== componentSlugs.length) {
    throw new ApiError(
      "A BeanBox cannot contain the same selection twice.",
      400,
    );
  }

  const featuredCount = componentSlugs.filter(isFeatured).length;

  if (boxSlug === "classic-box") {
    if (componentSlugs.length !== 1 || featuredCount !== 1) {
      throw new ApiError(
        "Classic Box requires exactly one Featured coffee.",
        400,
      );
    }
  } else if (boxSlug === "barista-box") {
    if (componentSlugs.length !== 2 || featuredCount !== 1) {
      throw new ApiError(
        "Barista Box requires one Featured coffee and one accessory.",
        400,
      );
    }
  } else if (boxSlug === "premium-box") {
    if (componentSlugs.length !== 3 || featuredCount !== 2) {
      throw new ApiError(
        "Premium Box requires two different Featured coffees and one accessory or flavour.",
        400,
      );
    }
  }

  return componentSlugs;
}

function mapOrder(
  row: OrderResponseRow,
  replayed = false,
) {
  return {
    id: row.id,
    status: row.status,
    subtotal: row.subtotal,
    deliveryFee: row.delivery_fee,
    total: row.total,
    createdAt: row.created_at,
    replayed,
  };
}

async function findExistingOrder(
  userId: string,
  idempotencyKey: string,
): Promise<OrderResponseRow | null> {
  const result = await getPool().query<OrderResponseRow>(
    `SELECT
       id,
       status,
       subtotal::text,
       delivery_fee::text,
       total::text,
       created_at
     FROM public.orders
     WHERE user_id = $1
       AND idempotency_key = $2
     LIMIT 1`,
    [userId, idempotencyKey],
  );

  return result.rows[0] ?? null;
}

async function rollbackQuietly(
  client: PoolClient | null,
  active: boolean,
) {
  if (client && active) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original error.
    }
  }
}

export async function POST(request: Request) {
  const dryRunConfigured =
    process.env.ORDERS_DRY_RUN_ENABLED === "true";

  // Fail closed if test mode was accidentally left on in production.
  if (dryRunConfigured && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        success: false,
        message:
          "Order processing is disabled: dry-run mode is misconfigured for production.",
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const dryRun =
    dryRunConfigured && process.env.NODE_ENV !== "production";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return NextResponse.json(
      {
        success: false,
        message: "Please sign in before placing an order.",
      },
      { status: 401 },
    );
  }

  if (!data.user.email) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Your account must have an email address to place an order.",
      },
      { status: 400 },
    );
  }

  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "A valid JSON body is required.",
      },
      { status: 400 },
    );
  }

  let payload: CheckoutPayload;

  try {
    payload = parsePayload(rawBody);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "The order data is invalid.",
      },
      { status: 400 },
    );
  }

  // Simulation must never return an existing real order.
  if (!dryRun) {
    try {
      const previous = await findExistingOrder(
        data.user.id,
        payload.idempotencyKey,
      );

      if (previous) {
        return NextResponse.json(
          {
            success: true,
            order: mapOrder(previous, true),
          },
          { status: 200 },
        );
      }
    } catch (error) {
      console.error("Unable to check order idempotency:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to verify the order. Please try again.",
        },
        { status: 500 },
      );
    }
  }

  const productIds = payload.items
    .filter(
      (item): item is ProductRequest => item.type === "product",
    )
    .map((item) => item.productId);

  let requestedBoxSlugs: string[];

  try {
    requestedBoxSlugs = payload.items
      .filter(
        (item): item is BeanBoxRequest => item.type === "beanbox",
      )
      .flatMap((item) =>
        validateBoxSelection(item.boxSlug, item.componentSlugs),
      );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "The BeanBox selection is invalid.",
      },
      { status: 400 },
    );
  }

  const requestedSlugs = [...new Set(requestedBoxSlugs)];
  const stockRequired = new Map<string, number>();

  let client: PoolClient | null = null;
  let transactionActive = false;

  try {
    client = await getPool().connect();

    await client.query("BEGIN");
    transactionActive = true;

    const result = await client.query<ProductRow>(
      `SELECT
         id::text,
         name,
         slug,
         category,
         price::text,
         stock
       FROM public.products
       WHERE is_active = TRUE
         AND (
           id = ANY($1::uuid[])
           OR slug = ANY($2::text[])
         )
       ORDER BY id
       FOR UPDATE`,
      [productIds, requestedSlugs],
    );

    const productsById = new Map<string, ProductRow>();
    const productsBySlug = new Map<string, ProductRow>();

    for (const product of result.rows) {
      productsById.set(product.id, product);
      productsBySlug.set(product.slug, product);
    }

    type PlannedProductLine = {
      type: "product";
      product: ProductRow;
      quantity: number;
      unitPriceMills: number;
    };

    type PlannedBoxLine = {
      type: "beanbox";
      boxSlug: BoxSlug;
      boxName: string;
      products: ProductRow[];
      quantity: number;
      unitPriceMills: number;
      configurationLabel: string;
    };

    const plannedLines: Array<
      PlannedProductLine | PlannedBoxLine
    > = [];

    for (const item of payload.items) {
      if (item.type === "product") {
        const product = productsById.get(item.productId);

        if (!product) {
          throw new ApiError(
            "A product is no longer available. Refresh your bag and try again.",
            409,
          );
        }

        const unitPriceMills = decimalToMills(product.price);

        plannedLines.push({
          type: "product",
          product,
          quantity: item.quantity,
          unitPriceMills,
        });

        stockRequired.set(
          product.id,
          (stockRequired.get(product.id) ?? 0) + item.quantity,
        );

        continue;
      }

      const componentSlugs = validateBoxSelection(
        item.boxSlug,
        item.componentSlugs,
      );

      const components = componentSlugs.map((slug) =>
        productsBySlug.get(slug),
      );

      if (components.some((product) => !product)) {
        throw new ApiError(
          "One or more products in this BeanBox are unavailable. Refresh your selection.",
          409,
        );
      }

      const products = components as ProductRow[];

      if (item.boxSlug === "barista-box") {
        const addOn = products.find(
          (product) => !isFeatured(product.slug),
        );

        if (!addOn || !isAccessory(addOn.category)) {
          throw new ApiError(
            "Barista Box requires an active accessory from the catalogue.",
            400,
          );
        }
      }

      if (item.boxSlug === "premium-box") {
        const addOn = products.find(
          (product) => !isFeatured(product.slug),
        );

        if (
          !addOn ||
          !(isAccessory(addOn.category) || isFlavour(addOn.category))
        ) {
          throw new ApiError(
            "Premium Box requires an active accessory or flavour from the catalogue.",
            400,
          );
        }
      }

      const unitPriceMills = products.reduce(
        (sum, product) => sum + decimalToMills(product.price),
        0,
      );

      const configurationLabel = products
        .map((product) => product.name)
        .join(" + ");

      plannedLines.push({
        type: "beanbox",
        boxSlug: item.boxSlug,
        boxName: BOX_NAMES[item.boxSlug],
        products,
        quantity: item.quantity,
        unitPriceMills,
        configurationLabel,
      });

      for (const product of products) {
        stockRequired.set(
          product.id,
          (stockRequired.get(product.id) ?? 0) + item.quantity,
        );
      }
    }

    // Aggregate requirements include products repeated in multiple lines.
    for (const [productId, requiredQuantity] of stockRequired) {
      const product = productsById.get(productId);

      if (!product || product.stock < requiredQuantity) {
        throw new ApiError(
          `Insufficient stock for ${
            product?.name ?? "a product"
          }. Refresh your bag and try again.`,
          409,
        );
      }
    }

    const subtotalMills = plannedLines.reduce(
      (sum, line) => sum + line.unitPriceMills * line.quantity,
      0,
    );

    if (!Number.isSafeInteger(subtotalMills)) {
      throw new ApiError(
        "The order total is outside the supported range.",
        400,
      );
    }

    const hasBeanBox = plannedLines.some(
      (line) => line.type === "beanbox",
    );

    const hasStandardProduct = plannedLines.some(
      (line) => line.type === "product",
    );

    const freeDelivery =
      (hasBeanBox && hasStandardProduct) ||
      subtotalMills > 200_000;

    let deliveryFeeMills = 0;

    if (!freeDelivery) {
      const configuredFee = process.env.DELIVERY_FEE_TND;

      if (
        configuredFee === undefined ||
        configuredFee.trim() === ""
      ) {
        throw new ApiError(
          "Delivery fee is not configured yet. Please contact the store before placing this order.",
          503,
        );
      }

      deliveryFeeMills = decimalToMills(configuredFee);
    }

    const totalMills = subtotalMills + deliveryFeeMills;

    if (!Number.isSafeInteger(totalMills)) {
      throw new ApiError(
        "The order total is outside the supported range.",
        400,
      );
    }

    if (dryRun) {
      // Roll back the read/lock transaction. No order insertion or stock update.
      await client.query("ROLLBACK");
      transactionActive = false;

      const itemCount = plannedLines.reduce(
        (sum, line) => sum + line.quantity,
        0,
      );

      return NextResponse.json(
        {
          success: true,
          dryRun: true,
          validation: {
            itemCount,
            productsChecked: stockRequired.size,
            subtotal: millsToDecimal(subtotalMills),
            deliveryFee: millsToDecimal(deliveryFeeMills),
            total: millsToDecimal(totalMills),
          },
          message:
            "Checkout validation passed. No order was created and no stock was changed.",
        },
        {
          status: 200,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    const orderResult = await client.query<OrderResponseRow>(
      `INSERT INTO public.orders (
         user_id,
         idempotency_key,
         customer_email,
         customer_name,
         customer_phone,
         shipping_address,
         shipping_governorate,
         shipping_city,
         shipping_postal_code,
         shipping_notes,
         payment_method,
         payment_status,
         status,
         currency,
         subtotal,
         delivery_fee,
         total
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10,
         'cash_on_delivery', 'unpaid', 'pending', 'TND',
         $11::numeric, $12::numeric, $13::numeric
       )
       RETURNING
         id,
         status,
         subtotal::text,
         delivery_fee::text,
         total::text,
         created_at`,
      [
        data.user.id,
        payload.idempotencyKey,
        data.user.email,
        payload.customerName,
        payload.customerPhone,
        payload.shippingAddress,
        payload.shippingGovernorate,
        payload.shippingCity,
        payload.shippingPostalCode,
        payload.shippingNotes,
        millsToDecimal(subtotalMills),
        millsToDecimal(deliveryFeeMills),
        millsToDecimal(totalMills),
      ],
    );

    const order = orderResult.rows[0];

    for (const line of plannedLines) {
      if (line.type === "product") {
        await client.query(
          `INSERT INTO public.order_items (
             order_id,
             product_id,
             item_type,
             product_name,
             product_slug,
             box_slug,
             configuration_label,
             quantity,
             unit_price,
             line_total
           ) VALUES (
             $1, $2, 'product', $3, $4,
             NULL, NULL, $5, $6::numeric, $7::numeric
           )`,
          [
            order.id,
            line.product.id,
            line.product.name,
            line.product.slug,
            line.quantity,
            millsToDecimal(line.unitPriceMills),
            millsToDecimal(
              line.unitPriceMills * line.quantity,
            ),
          ],
        );
      } else {
        const itemResult = await client.query<{ id: string }>(
          `INSERT INTO public.order_items (
             order_id,
             product_id,
             item_type,
             product_name,
             product_slug,
             box_slug,
             configuration_label,
             quantity,
             unit_price,
             line_total
           ) VALUES (
             $1, NULL, 'beanbox', $2, $3, $3, $4,
             $5, $6::numeric, $7::numeric
           )
           RETURNING id`,
          [
            order.id,
            line.boxName,
            line.boxSlug,
            line.configurationLabel,
            line.quantity,
            millsToDecimal(line.unitPriceMills),
            millsToDecimal(
              line.unitPriceMills * line.quantity,
            ),
          ],
        );

        const orderItemId = itemResult.rows[0].id;

        for (const component of line.products) {
          await client.query(
            `INSERT INTO public.order_item_components (
               order_item_id,
               product_id,
               product_name,
               product_slug,
               quantity_per_box,
               unit_price
             ) VALUES ($1, $2, $3, $4, 1, $5::numeric)`,
            [
              orderItemId,
              component.id,
              component.name,
              component.slug,
              millsToDecimal(decimalToMills(component.price)),
            ],
          );
        }
      }
    }

    // The stock decrements and order inserts are committed atomically.
    for (const [productId, requiredQuantity] of stockRequired) {
      const update = await client.query(
        `UPDATE public.products
         SET stock = stock - $2, updated_at = now()
         WHERE id = $1
           AND is_active = TRUE
           AND stock >= $2`,
        [productId, requiredQuantity],
      );

      if (update.rowCount !== 1) {
        throw new ApiError(
          "Stock changed while processing the order. Please try again.",
          409,
        );
      }
    }

    await client.query("COMMIT");
    transactionActive = false;

    return NextResponse.json(
      {
        success: true,
        order: mapOrder(order),
      },
      {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    await rollbackQuietly(client, transactionActive);
    transactionActive = false;

    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        {
          status: error.status,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    const databaseError = error as { code?: string };

    if (databaseError?.code === "23505") {
      try {
        const existing = await findExistingOrder(
          data.user.id,
          payload.idempotencyKey,
        );

        if (existing) {
          return NextResponse.json(
            {
              success: true,
              order: mapOrder(existing, true),
            },
            {
              status: 200,
              headers: { "Cache-Control": "no-store" },
            },
          );
        }
      } catch (lookupError) {
        console.error(
          "Unable to retrieve an existing order:",
          lookupError,
        );
      }
    }

    console.error("Failed to create order:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to place the order. Please try again.",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } finally {
    client?.release();
  }
}