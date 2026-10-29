import { NextResponse } from "next/server";

import { getPool } from "@/lib/db";
import { requireAdminApi } from "@/lib/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  status: string;
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

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const result = await getPool().query<AdminOrderRow>(
      `
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
              ORDER BY oi.created_at
            ) FILTER (WHERE oi.id IS NOT NULL),
            '[]'::json
          ) AS items

        FROM public.orders o
        LEFT JOIN public.order_items oi
          ON oi.order_id = o.id

        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT 100
      `,
    );

    return NextResponse.json(
      {
        success: true,
        data: result.rows,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("Failed to retrieve admin orders:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to retrieve orders.",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}