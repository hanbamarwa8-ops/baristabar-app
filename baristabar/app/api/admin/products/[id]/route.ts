import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/require-admin-api";
import {
  getDatabaseErrorCode,
  isValidProductId,
  updateAdminProduct,
  validateProductPayload,
} from "@/lib/admin-products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  if (!isValidProductId(id)) {
    return NextResponse.json(
      { success: false, message: "A valid product ID is required." },
      { status: 400 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "A valid JSON body is required." },
      { status: 400 },
    );
  }

  const validation = validateProductPayload(body);

  if (!validation.ok) {
    return NextResponse.json(
      { success: false, message: validation.message },
      { status: 400 },
    );
  }

  try {
    const product = await updateAdminProduct(id, validation.value);

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    const code = getDatabaseErrorCode(error);

    if (code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "A product with this slug already exists.",
        },
        { status: 409 },
      );
    }

    console.error("Failed to update product:", error);

    return NextResponse.json(
      { success: false, message: "Unable to update product." },
      { status: code === "22P02" ? 400 : 500 },
    );
  }
}