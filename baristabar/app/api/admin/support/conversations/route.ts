
import { NextResponse } from "next/server";

import { getPool } from "@/lib/db";
import { requireAdminApi } from "@/lib/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 1_000_000;
const MAX_SEARCH_LENGTH = 120;

const STATUSES = ["all", "open", "closed"] as const;

type ConversationStatusFilter = (typeof STATUSES)[number];

interface CountRow {
  total: number;
}

interface StatisticsRow {
  total: number;
  open: number;
  closed: number;
  unread: number;
}

interface ConversationListRow {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerStatus: "active" | "suspended" | null;
  status: "open" | "closed";
  createdAt: Date | string;
  updatedAt: Date | string;
  lastMessageAt: Date | string;
  lastMessage: string | null;
  lastSenderRole: "customer" | "admin" | null;
  unreadCount: number;
}

const CONVERSATION_ROWS_CTE = `
  WITH conversation_rows AS (
    SELECT
      c.id::text AS id,
      c.customer_id::text AS "customerId",
      COALESCE(
        NULLIF(BTRIM(p.full_name), ''),
        NULLIF(BTRIM(u.raw_user_meta_data ->> 'full_name'), ''),
        NULLIF(BTRIM(u.raw_user_meta_data ->> 'name'), ''),
        'Customer'
      ) AS "customerName",
      NULLIF(BTRIM(u.email), '') AS "customerEmail",
      COALESCE(
        NULLIF(BTRIM(p.phone), ''),
        NULLIF(BTRIM(u.phone), ''),
        NULLIF(BTRIM(u.raw_user_meta_data ->> 'phone'), '')
      ) AS "customerPhone",
      p.account_status AS "customerStatus",
      c.status,
      c.created_at AS "createdAt",
      c.updated_at AS "updatedAt",
      c.last_message_at AS "lastMessageAt",
      latest.body AS "lastMessage",
      latest.sender_role AS "lastSenderRole",
      COALESCE(unread.unread_count, 0)::int AS "unreadCount"
    FROM public.support_conversations c
    LEFT JOIN public.profiles p
      ON p.id = c.customer_id
    LEFT JOIN auth.users u
      ON u.id = c.customer_id
    LEFT JOIN LATERAL (
      SELECT m.body, m.sender_role
      FROM public.support_messages m
      WHERE m.conversation_id = c.id
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT 1
    ) AS latest ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS unread_count
      FROM public.support_messages m
      WHERE m.conversation_id = c.id
        AND m.sender_role = 'customer'
        AND m.read_at IS NULL
    ) AS unread ON TRUE
  )
`;

const CONVERSATION_FILTER_SQL = `
  ($1::text = 'all' OR status = $1)
  AND (
    $2::text = ''
    OR "customerName" ILIKE '%' || $2 || '%'
    OR COALESCE("customerEmail", '') ILIKE '%' || $2 || '%'
    OR COALESCE("customerPhone", '') ILIKE '%' || $2 || '%'
    OR "customerId" ILIKE '%' || $2 || '%'
    OR COALESCE("lastMessage", '') ILIKE '%' || $2 || '%'
  )
`;

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function parsePositiveInteger(
  value: string | null,
  fallback: number,
  maximum: number,
): number | null {
  if (value === null) return fallback;

  if (!/^[1-9]\d*$/.test(value)) return null;

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) &&
    parsed >= 1 &&
    parsed <= maximum
    ? parsed
    : null;
}

function isStatusFilter(
  value: string,
): value is ConversationStatusFilter {
  return (STATUSES as readonly string[]).includes(value);
}

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);

  if (!auth.ok) return auth.response;

  const params = new URL(request.url).searchParams;

  const requestedPage = parsePositiveInteger(
    params.get("page"),
    1,
    MAX_PAGE,
  );

  const limit = parsePositiveInteger(
    params.get("limit"),
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
  );

  if (requestedPage === null || limit === null) {
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

  const status = params.get("status") ?? "open";

  if (!isStatusFilter(status)) {
    return jsonError(
      "Invalid conversation status filter.",
      400,
    );
  }

  try {
    const pool = getPool();
    const filterValues = [status, search];

    const [countResult, statisticsResult] = await Promise.all([
      pool.query<CountRow>(
        `${CONVERSATION_ROWS_CTE}
         SELECT COUNT(*)::int AS total
         FROM conversation_rows
         WHERE ${CONVERSATION_FILTER_SQL}`,
        filterValues,
      ),

      pool.query<StatisticsRow>(
        `${CONVERSATION_ROWS_CTE}
         SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'open')::int AS open,
           COUNT(*) FILTER (WHERE status = 'closed')::int AS closed,
           COALESCE(SUM("unreadCount"), 0)::int AS unread
         FROM conversation_rows`,
        [],
      ),
    ]);

    const total = countResult.rows[0]?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    const page =
      totalPages === 0
        ? 1
        : Math.min(requestedPage, totalPages);

    const offset = (page - 1) * limit;

    const conversationsResult =
      await pool.query<ConversationListRow>(
        `${CONVERSATION_ROWS_CTE}
         SELECT *
         FROM conversation_rows
         WHERE ${CONVERSATION_FILTER_SQL}
         ORDER BY "lastMessageAt" DESC, id DESC
         LIMIT $3::int OFFSET $4::int`,
        [...filterValues, limit, offset],
      );

    const stats = statisticsResult.rows[0];

    return NextResponse.json(
      {
        success: true,
        data: conversationsResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasPreviousPage: page > 1,
          hasNextPage: page < totalPages,
        },
        statistics: {
          total: stats?.total ?? 0,
          open: stats?.open ?? 0,
          closed: stats?.closed ?? 0,
          unread: stats?.unread ?? 0,
        },
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error(
      "Failed to retrieve support conversations:",
      error,
    );

    return jsonError(
      "Unable to retrieve support conversations.",
      500,
    );
  }
}
