import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/require-admin-api";
import {
  createAdminProduct,
  findAllAdminProducts,
  getDatabaseErrorCode,
  validateProductPayload,
} from "@/lib/admin-products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  try {
    const products = await findAllAdminProducts();

    return NextResponse.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Failed to retrieve admin products:", error);

    return NextResponse.json(
      { success: false, message: "Unable to retrieve products." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

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
    const product = await createAdminProduct(validation.value);

    return NextResponse.json(
      { success: true, data: product },
      { status: 201 },
    );
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

    console.error("Failed to create product:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create product.",
      },
      { status: code === "22P02" ? 400 : 500 },
    );
  }
}