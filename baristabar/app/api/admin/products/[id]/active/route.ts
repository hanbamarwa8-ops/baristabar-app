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

export async function PATCH(request: Request, context: RouteContext) {
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

  if (
    typeof body !== "object" ||
    body === null ||
    !("is_active" in body) ||
    typeof body.is_active !== "boolean"
  ) {
    return NextResponse.json(
      { success: false, message: "is_active must be true or false." },
      { status: 400 },
    );
  }

  try {
    const product = await updateProductActiveStatus(
      id,
      body.is_active,
    );

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("Failed to update product status:", error);

    return NextResponse.json(
      { success: false, message: "Unable to update product status." },
      { status: 500 },
    );
  }
}