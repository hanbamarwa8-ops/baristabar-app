import { NextResponse } from "next/server";
import type { PoolClient } from "pg";

import { getPool } from "@/lib/db";
import { requireAdminApi } from "@/lib/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };
type CustomerStatus = "active" | "suspended";

interface CustomerLockRow {
  id: string;
  role: string;
  account_status: CustomerStatus;
}
interface UpdatedCustomerRow {
  id: string;
  account_status: CustomerStatus;
  suspended_at: Date | string | null;
  suspended_by: string | null;
  suspension_reason: string | null;
  updated_at: Date | string;
}

class ApiError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
    this.name = "ApiError";
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePayload(value: unknown): { accountStatus: CustomerStatus; reason: string | null } {
  if (
    !isRecord(value) ||
    (value.accountStatus !== "active" && value.accountStatus !== "suspended")
  ) {
    throw new ApiError("accountStatus must be either 'active' or 'suspended'.", 400);
  }

  let reason: string | null = null;
  if (value.reason !== undefined) {
    if (typeof value.reason !== "string") {
      throw new ApiError("reason must be a string.", 400);
    }
    reason = value.reason.trim() || null;
    if (reason && reason.length > 500) {
      throw new ApiError("reason cannot exceed 500 characters.", 400);
    }
  }

  return {
    accountStatus: value.accountStatus,
    reason: value.accountStatus === "suspended" ? reason : null,
  };
}

async function rollbackQuietly(client: PoolClient, transactionActive: boolean) {
  if (!transactionActive) return;
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserve the original error.
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json(
      { success: false, message: "A valid customer ID is required." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "A valid JSON body is required." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  let payload: ReturnType<typeof parsePayload>;
  try {
    payload = parsePayload(body);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.statusCode, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { success: false, message: "Invalid customer status." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  let client: PoolClient | null = null;
  let transactionActive = false;

  try {
    client = await getPool().connect();
    await client.query("BEGIN");
    transactionActive = true;

    // Coordinates with checkout's SELECT ... FOR SHARE on the profile row.
    const customerResult = await client.query<CustomerLockRow>(
      `
        SELECT id::text, role, account_status
        FROM public.profiles
        WHERE id = $1::uuid
        FOR UPDATE
      `,
      [id],
    );

    const customer = customerResult.rows[0];
    if (!customer || customer.role !== "customer") {
      throw new ApiError("Customer not found.", 404);
    }

    if (customer.account_status === payload.accountStatus) {
      await client.query("COMMIT");
      transactionActive = false;
      return NextResponse.json(
        {
          success: true,
          message: "The customer already has this account status.",
          data: { id: customer.id, accountStatus: customer.account_status },
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const updateResult = await client.query<UpdatedCustomerRow>(
      `
        UPDATE public.profiles
        SET
          account_status = $2,
          suspended_at = CASE WHEN $2 = 'suspended' THEN now() ELSE NULL END,
          suspended_by = CASE WHEN $2 = 'suspended' THEN $3::uuid ELSE NULL END,
          suspension_reason = CASE WHEN $2 = 'suspended' THEN $4::varchar(500) ELSE NULL END,
          updated_at = now()
        WHERE id = $1::uuid AND role = 'customer'
        RETURNING
          id::text,
          account_status,
          suspended_at,
          suspended_by::text,
          suspension_reason,
          updated_at
      `,
      [id, payload.accountStatus, auth.userId, payload.reason],
    );

    const updatedCustomer = updateResult.rows[0];
    if (!updatedCustomer) throw new ApiError("Customer not found.", 404);

    await client.query("COMMIT");
    transactionActive = false;

    return NextResponse.json(
      {
        success: true,
        message: payload.accountStatus === "suspended"
          ? "Customer account suspended."
          : "Customer account reactivated.",
        data: {
          id: updatedCustomer.id,
          accountStatus: updatedCustomer.account_status,
          suspendedAt: updatedCustomer.suspended_at,
          suspendedBy: updatedCustomer.suspended_by,
          suspensionReason: updatedCustomer.suspension_reason,
          updatedAt: updatedCustomer.updated_at,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (client) await rollbackQuietly(client, transactionActive);

    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.statusCode, headers: { "Cache-Control": "no-store" } },
      );
    }

    console.error("Failed to update customer account status:", error);
    return NextResponse.json(
      { success: false, message: "Unable to update customer status." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    client?.release();
  }
}
