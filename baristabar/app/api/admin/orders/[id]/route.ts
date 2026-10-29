import { NextResponse } from "next/server";
import type { PoolClient } from "pg";

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

type OrderStatus = (typeof ORDER_STATUSES)[number];

interface OrderRow {
  id: string;
  status: OrderStatus;
}

interface StatusPayload {
  status: OrderStatus;
}

class ApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const ALLOWED_TRANSITIONS: Record<
  OrderStatus,
  readonly OrderStatus[]
> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    (ORDER_STATUSES as readonly string[]).includes(value)
  );
}

function parseStatusPayload(value: unknown): StatusPayload {
  if (!isRecord(value) || !isOrderStatus(value.status)) {
    throw new ApiError(
      "A valid order status is required.",
      400,
    );
  }

  return { status: value.status };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function rollbackQuietly(
  client: PoolClient,
  transactionActive: boolean,
) {
  if (!transactionActive) return;

  try {
    await client.query("ROLLBACK");
  } catch {
    // Conserver l'erreur initiale.
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;

  if (!isUuid(id)) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid order ID.",
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

  let payload: StatusPayload;

  try {
    payload = parseStatusPayload(rawBody);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { success: false, message: "Invalid order status." },
      { status: 400 },
    );
  }

  let client: PoolClient | null = null;
  let transactionActive = false;

  try {
    client = await getPool().connect();

    await client.query("BEGIN");
    transactionActive = true;

    // Verrouiller la commande pour éviter deux annulations concurrentes.
    const orderResult = await client.query<OrderRow>(
      `
        SELECT id::text, status
        FROM public.orders
        WHERE id = $1::uuid
        FOR UPDATE
      `,
      [id],
    );

    const order = orderResult.rows[0];

    if (!order) {
      throw new ApiError("Order not found.", 404);
    }

    // Une répétition de la même demande ne doit pas restaurer
    // le stock une deuxième fois.
    if (order.status === payload.status) {
      await client.query("COMMIT");
      transactionActive = false;

      return NextResponse.json(
        {
          success: true,
          data: {
            id: order.id,
            status: order.status,
          },
          message: "The order already has this status.",
        },
        {
          status: 200,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    if (
      !ALLOWED_TRANSITIONS[order.status].includes(payload.status)
    ) {
      throw new ApiError(
        `The transition from '${order.status}' to '${payload.status}' is not allowed.`,
        409,
      );
    }

    if (payload.status === "cancelled") {
      // Restaurer le stock des produits ordinaires et des composants
      // BeanBox dans la même transaction que l'annulation.
      //
      // La commande est verrouillée et seule une transition vers
      // "cancelled" depuis un statut annulable atteint ce bloc.
      await client.query(
        `
          WITH stock_requirements AS (
            SELECT
              required_items.product_id,
              SUM(required_items.quantity)::bigint AS quantity
            FROM (
              SELECT
                oi.product_id,
                oi.quantity::bigint AS quantity
              FROM public.order_items oi
              WHERE oi.order_id = $1::uuid
                AND oi.item_type = 'product'
                AND oi.product_id IS NOT NULL

              UNION ALL

              SELECT
                c.product_id,
                (
                  oi.quantity::bigint *
                  c.quantity_per_box::bigint
                ) AS quantity
              FROM public.order_items oi
              JOIN public.order_item_components c
                ON c.order_item_id = oi.id
              WHERE oi.order_id = $1::uuid
                AND oi.item_type = 'beanbox'
            ) AS required_items
            GROUP BY required_items.product_id
          )
          UPDATE public.products p
          SET
            stock = p.stock + stock_requirements.quantity::integer,
            updated_at = now()
          FROM stock_requirements
          WHERE p.id = stock_requirements.product_id
        `,
        [id],
      );
    }

    const updateResult = await client.query<OrderRow>(
      `
        UPDATE public.orders
        SET
          status = $2,
          updated_at = now()
        WHERE id = $1::uuid
        RETURNING id::text, status
      `,
      [id, payload.status],
    );

    const updatedOrder = updateResult.rows[0];

    await client.query("COMMIT");
    transactionActive = false;

    return NextResponse.json(
      {
        success: true,
        data: updatedOrder,
        message:
          payload.status === "cancelled"
            ? "Order cancelled and stock restored."
            : "Order status updated.",
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    if (client) {
      await rollbackQuietly(client, transactionActive);
    }

    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        {
          status: error.statusCode,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    console.error("Failed to update order status:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update the order status.",
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