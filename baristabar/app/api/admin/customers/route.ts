import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAdminApi } from "@/lib/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 1_000_000;
const MAX_SEARCH_LENGTH = 120;
const CUSTOMER_STATUSES = ["all", "active", "suspended"] as const;
type CustomerStatusFilter = (typeof CUSTOMER_STATUSES)[number];

interface CountRow { total: number }
interface CustomerStatisticsRow {
  total_customers: number;
  active_customers: number;
  suspended_customers: number;
  total_paid: string;
}
interface CustomerRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  accountStatus: "active" | "suspended";
  createdAt: Date | string;
  orderCount: number;
  totalSpent: string;
  lastOrderAt: Date | string | null;
}

const CUSTOMER_ROWS_CTE = `
  WITH customer_rows AS (
    SELECT
      p.id::text AS id,
      COALESCE(
        NULLIF(BTRIM(p.full_name), ''),
        NULLIF(BTRIM(u.raw_user_meta_data ->> 'full_name'), ''),
        NULLIF(BTRIM(u.raw_user_meta_data ->> 'name'), ''),
        NULLIF(BTRIM(recent_order.customer_name), ''),
        'Customer'
      ) AS name,
      COALESCE(
        NULLIF(BTRIM(u.email), ''),
        NULLIF(BTRIM(recent_order.customer_email), '')
      ) AS email,
      COALESCE(
        NULLIF(BTRIM(p.phone), ''),
        NULLIF(BTRIM(u.phone), ''),
        NULLIF(BTRIM(u.raw_user_meta_data ->> 'phone'), ''),
        NULLIF(BTRIM(recent_order.customer_phone), '')
      ) AS phone,
      p.account_status AS "accountStatus",
      p.created_at AS "createdAt",
      order_summary.order_count AS "orderCount",
      order_summary.total_spent AS "totalSpent",
      order_summary.last_order_at AS "lastOrderAt"
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS order_count,
        COALESCE(
          SUM(o.total) FILTER (
            WHERE o.payment_status = 'paid' AND o.status <> 'cancelled'
          ),
          0
        )::text AS total_spent,
        MAX(o.created_at) AS last_order_at
      FROM public.orders o
      WHERE o.user_id = p.id
    ) AS order_summary ON TRUE
    LEFT JOIN LATERAL (
      SELECT o.customer_name, o.customer_email, o.customer_phone
      FROM public.orders o
      WHERE o.user_id = p.id
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT 1
    ) AS recent_order ON TRUE
    WHERE p.role = 'customer'
  )
`;

const CUSTOMER_FILTER_SQL = `
  (
    $1::text = ''
    OR id ILIKE '%' || $1 || '%'
    OR name ILIKE '%' || $1 || '%'
    OR COALESCE(email, '') ILIKE '%' || $1 || '%'
    OR COALESCE(phone, '') ILIKE '%' || $1 || '%'
  )
  AND ($2::text = 'all' OR "accountStatus" = $2)
`;

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function parsePositiveInteger(value: string | null, fallback: number, maximum: number): number | null {
  if (value === null) return fallback;
  if (!/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= maximum
    ? parsed
    : null;
}

function isCustomerStatusFilter(value: string): value is CustomerStatusFilter {
  return (CUSTOMER_STATUSES as readonly string[]).includes(value);
}

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const params = new URL(request.url).searchParams;
  const requestedPage = parsePositiveInteger(params.get("page"), 1, MAX_PAGE);
  const pageSize = parsePositiveInteger(params.get("limit"), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  if (requestedPage === null || pageSize === null) {
    return jsonError("Page and limit must be valid positive integers.", 400);
  }

  const search = (params.get("search") ?? "").trim();
  if (search.length > MAX_SEARCH_LENGTH) {
    return jsonError(`Search cannot exceed ${MAX_SEARCH_LENGTH} characters.`, 400);
  }

  const status = params.get("status") ?? "all";
  if (!isCustomerStatusFilter(status)) {
    return jsonError("Invalid customer status filter.", 400);
  }

  try {
    const pool = getPool();
    const filterValues = [search, status];
    const [countResult, statisticsResult] = await Promise.all([
      pool.query<CountRow>(
        `${CUSTOMER_ROWS_CTE}
         SELECT COUNT(*)::int AS total
         FROM customer_rows
         WHERE ${CUSTOMER_FILTER_SQL}`,
        filterValues,
      ),
      pool.query<CustomerStatisticsRow>(
        `${CUSTOMER_ROWS_CTE}
         SELECT
           COUNT(*)::int AS total_customers,
           COUNT(*) FILTER (WHERE "accountStatus" = 'active')::int AS active_customers,
           COUNT(*) FILTER (WHERE "accountStatus" = 'suspended')::int AS suspended_customers,
           COALESCE(SUM("totalSpent"::numeric), 0)::text AS total_paid
         FROM customer_rows`,
      ),
    ]);

    const total = countResult.rows[0]?.total ?? 0;
    const totalPages = Math.ceil(total / pageSize);
    const page = totalPages === 0 ? 1 : Math.min(requestedPage, totalPages);
    const offset = (page - 1) * pageSize;

    const customersResult = await pool.query<CustomerRow>(
      `${CUSTOMER_ROWS_CTE}
       SELECT * FROM customer_rows
       WHERE ${CUSTOMER_FILTER_SQL}
       ORDER BY "createdAt" DESC, id DESC
       LIMIT $3::int OFFSET $4::int`,
      [...filterValues, pageSize, offset],
    );

    const statistics = statisticsResult.rows[0];
    return NextResponse.json(
      {
        success: true,
        data: customersResult.rows,
        pagination: {
          page, limit: pageSize, total, totalPages,
          hasPreviousPage: page > 1,
          hasNextPage: page < totalPages,
        },
        statistics: {
          totalCustomers: statistics?.total_customers ?? 0,
          activeCustomers: statistics?.active_customers ?? 0,
          suspendedCustomers: statistics?.suspended_customers ?? 0,
          totalPaid: statistics?.total_paid ?? "0",
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to retrieve admin customers:", error);
    return jsonError("Unable to retrieve customers.", 500);
  }
}
