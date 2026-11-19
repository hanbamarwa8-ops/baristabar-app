import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/require-admin-api";
import {
  isValidProductId,
  updateProductActiveStatus,
} from "@/lib/admin-products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminApi(request);

  if (!auth.ok) {
    return auth.response;
  }

  let id: string;

  try {
    ({ id } = await context.params);
  } catch {
    return jsonResponse(
      { success: false, message: "A valid product ID is required." },
      400,
    );
  }

  if (!isValidProductId(id)) {
    return jsonResponse(
      { success: false, message: "A valid product ID is required." },
      400,
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      { success: false, message: "A valid JSON body is required." },
      400,
    );
  }

  if (!isRecord(body) || typeof body.is_active !== "boolean") {
    return jsonResponse(
      { success: false, message: "is_active must be true or false." },
      400,
    );
  }

  try {
    const product = await updateProductActiveStatus(id, body.is_active);

    if (!product) {
      return jsonResponse(
        { success: false, message: "Product not found." },
        404,
      );
    }

    return jsonResponse({
      success: true,
      message: body.is_active
        ? "Product activated successfully."
        : "Product deactivated successfully.",
      data: product,
    });
  } catch (error) {
    console.error("Failed to update product status:", error);

    return jsonResponse(
      {
        success: false,
        message: "Unable to update product status.",
      },
      500,
    );
  }
}
