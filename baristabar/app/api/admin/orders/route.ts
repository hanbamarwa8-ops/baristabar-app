import { NextResponse } from "next/server";

import { getPool } from "@/lib/db";
import { requireAdminApi } from "@/lib/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

const DATE_FILTERS = ["all", "today", "7days", "30days"] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];
type DateFilter = (typeof DATE_FILTERS)[number];

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 1_000_000;
const MAX_SEARCH_LENGTH = 120;

interface AdminOrderRow {
  id: string;
  createdAt: Date | string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  shippingGovernorate: string | null;
  shippingCity: string;
  shippingPostalCode: string | null;
  shippingNotes: string | null;
  paymentMethod: string;
  paymentStatus: string;
  status: OrderStatus;
  currency: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  items: Array<{
    id: string;
    type: string;
    name: string;
    slug: string;
    boxSlug: string | null;
    configurationLabel: string | null;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
  }>;
}

interface CountRow {
  total: number;
}

interface StatisticsRow {
  total: number;
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  revenue: string;
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function parsePositiveInteger(
  value: string | null,
  fallback: number,
  maximum: number,
): number | null {
  if (value === null) {
    return fallback;
  }

  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const parsed = Number(value);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 1 ||
    parsed > maximum
  ) {
    return null;
  }

  return parsed;
}

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

function isDateFilter(value: string): value is DateFilter {
  return (DATE_FILTERS as readonly string[]).includes(value);
}

// Shared filters for the count and paginated order queries.
const ORDER_FILTER_SQL = `
  (
    $1::text = ''
    OR o.id::text ILIKE '%' || $1 || '%'
    OR o.customer_name ILIKE '%' || $1 || '%'
    OR o.customer_email ILIKE '%' || $1 || '%'
    OR o.customer_phone ILIKE '%' || $1 || '%'
    OR o.shipping_address ILIKE '%' || $1 || '%'
    OR o.shipping_city ILIKE '%' || $1 || '%'
    OR COALESCE(o.shipping_governorate, '') ILIKE '%' || $1 || '%'
    OR COALESCE(o.shipping_postal_code, '') ILIKE '%' || $1 || '%'
    OR COALESCE(o.shipping_notes, '') ILIKE '%' || $1 || '%'
    OR EXISTS (
      SELECT 1
      FROM public.order_items oi
      WHERE oi.order_id = o.id
        AND (
          oi.product_name ILIKE '%' || $1 || '%'
          OR oi.product_slug ILIKE '%' || $1 || '%'
          OR COALESCE(oi.box_slug, '') ILIKE '%' || $1 || '%'
          OR COALESCE(oi.configuration_label, '') ILIKE '%' || $1 || '%'
        )
    )
  )
  AND (
    $2::text IS NULL
    OR o.status = $2
  )
  AND (
    $3::text = 'all'

    OR (
      $3::text = 'today'
      AND o.created_at >= (
        date_trunc(
          'day',
          CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Tunis'
        ) AT TIME ZONE 'Africa/Tunis'
      )
      AND o.created_at < (
        (
          date_trunc(
            'day',
            CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Tunis'
          ) + INTERVAL '1 day'
        ) AT TIME ZONE 'Africa/Tunis'
      )
    )

    OR (
      $3::text = '7days'
      AND o.created_at >= NOW() - INTERVAL '7 days'
      AND o.created_at <= NOW()
    )

    OR (
      $3::text = '30days'
      AND o.created_at >= NOW() - INTERVAL '30 days'
      AND o.created_at <= NOW()
    )
  )
`;

export async function GET(request: Request) {
  // 1. Authenticate the administrator.
  const auth = await requireAdminApi(request);

  if (!auth.ok) {
    return auth.response;
  }

  // 2. Parse and validate query parameters.
  const requestUrl = new URL(request.url);
  const params = requestUrl.searchParams;

  const requestedPage = parsePositiveInteger(
    params.get("page"),
    1,
    MAX_PAGE,
  );

  const pageSize = parsePositiveInteger(
    params.get("limit"),
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
  );

  if (requestedPage === null || pageSize === null) {
    return jsonError(
      "Page and limit must be valid positive integers.",
      400,
    );
  }

  const search = (params.get("search") ?? "").trim();

  if (search.length > MAX_SEARCH_LENGTH) {
    return jsonError(
      `Search cannot exceed ${MAX_SEARCH_LENGTH} characters.`,
      400,
    );
  }

  const statusParam = params.get("status") ?? "all";

  if (statusParam !== "all" && !isOrderStatus(statusParam)) {
    return jsonError("Invalid order status filter.", 400);
  }

  const dateParam = params.get("date") ?? "all";

  if (!isDateFilter(dateParam)) {
    return jsonError("Invalid date filter.", 400);
  }

  const status = statusParam === "all" ? null : statusParam;

  const filterValues: (string | null)[] = [
    search,
    status,
    dateParam,
  ];

  try {
    const pool = getPool();

    // 3. Count matching orders and calculate global statistics.
    // Statistics deliberately ignore the active filters and pagination.
    const [countResult, statisticsResult] = await Promise.all([
      pool.query<CountRow>(
        `
          SELECT COUNT(*)::int AS total
          FROM public.orders o
          WHERE ${ORDER_FILTER_SQL}
        `,
        filterValues,
      ),

      pool.query<StatisticsRow>(
        `
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (
              WHERE status = 'pending'
            )::int AS pending,
            COUNT(*) FILTER (
              WHERE status = 'confirmed'
            )::int AS confirmed,
            COUNT(*) FILTER (
              WHERE status = 'processing'
            )::int AS processing,
            COUNT(*) FILTER (
              WHERE status = 'shipped'
            )::int AS shipped,
            COUNT(*) FILTER (
              WHERE status = 'delivered'
            )::int AS delivered,
            COUNT(*) FILTER (
              WHERE status = 'cancelled'
            )::int AS cancelled,
            COALESCE(
              SUM(total) FILTER (
                WHERE status <> 'cancelled'
              ),
              0
            )::text AS revenue
          FROM public.orders
        `,
      ),
    ]);

    const total = countResult.rows[0]?.total ?? 0;
    const totalPages = Math.ceil(total / pageSize);

    // If filters reduce the result count, keep the page within valid bounds.
    const page =
      totalPages === 0
        ? 1
        : Math.min(requestedPage, totalPages);

    const offset = (page - 1) * pageSize;

    // 4. Fetch only the requested page of orders.
    // Paginate order IDs before joining order items to avoid
    // limiting individual item rows instead of complete orders.
    const ordersResult = await pool.query<AdminOrderRow>(
      `
        WITH page_orders AS (
          SELECT o.id
          FROM public.orders o
          WHERE ${ORDER_FILTER_SQL}
          ORDER BY o.created_at DESC, o.id DESC
          LIMIT $4::int
          OFFSET $5::int
        )

        SELECT
          o.id,
          o.created_at AS "createdAt",
          o.customer_email AS "customerEmail",
          o.customer_name AS "customerName",
          o.customer_phone AS "customerPhone",
          o.shipping_address AS "shippingAddress",
          o.shipping_governorate AS "shippingGovernorate",
          o.shipping_city AS "shippingCity",
          o.shipping_postal_code AS "shippingPostalCode",
          o.shipping_notes AS "shippingNotes",
          o.payment_method AS "paymentMethod",
          o.payment_status AS "paymentStatus",
          o.status,
          o.currency,
          o.subtotal::text AS subtotal,
          o.delivery_fee::text AS "deliveryFee",
          o.total::text AS total,

          COALESCE(
            json_agg(
              json_build_object(
                'id', oi.id,
                'type', oi.item_type,
                'name', oi.product_name,
                'slug', oi.product_slug,
                'boxSlug', oi.box_slug,
                'configurationLabel', oi.configuration_label,
                'quantity', oi.quantity,
                'unitPrice', oi.unit_price::text,
                'lineTotal', oi.line_total::text
              )
              ORDER BY oi.created_at, oi.id
            ) FILTER (WHERE oi.id IS NOT NULL),
            '[]'::json
          ) AS items

        FROM page_orders po
        INNER JOIN public.orders o
          ON o.id = po.id
        LEFT JOIN public.order_items oi
          ON oi.order_id = o.id

        GROUP BY o.id
        ORDER BY o.created_at DESC, o.id DESC
      `,
      [
        ...filterValues,
        pageSize,
        offset,
      ],
    );

    // 5. Return paginated data and global statistics.
    const statistics = statisticsResult.rows[0];

    return NextResponse.json(
      {
        success: true,
        data: ordersResult.rows,
        pagination: {
          page,
          limit: pageSize,
          total,
          totalPages,
          hasPreviousPage: page > 1,
          hasNextPage: page < totalPages,
        },
        statistics: {
          total: statistics?.total ?? 0,
          pending: statistics?.pending ?? 0,
          confirmed: statistics?.confirmed ?? 0,
          processing: statistics?.processing ?? 0,
          shipped: statistics?.shipped ?? 0,
          delivered: statistics?.delivered ?? 0,
          cancelled: statistics?.cancelled ?? 0,
          revenue: statistics?.revenue ?? "0",
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Failed to retrieve admin orders:", error);

    return jsonError(
      "Unable to retrieve orders.",
      500,
    );
  }
}
