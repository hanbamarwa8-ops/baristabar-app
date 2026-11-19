import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/require-admin-api";

import {
  createAdminProduct,
  findAllAdminProducts,
  getDatabaseErrorCode,
  ProductCategoryNotFoundError,
  validateProductPayload,
} from "@/lib/admin-products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
};

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);

  if (!auth.ok) return auth.response;

  try {
    const products = await findAllAdminProducts();

    return NextResponse.json(
      {
        success: true,
        data: products,
      },
      { headers: RESPONSE_HEADERS },
    );
  } catch (error) {
    console.error("Failed to retrieve admin products:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to retrieve products.",
      },
      { status: 500, headers: RESPONSE_HEADERS },
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
      {
        success: false,
        message: "A valid JSON body is required.",
      },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  const validation = validateProductPayload(body);

  if (!validation.ok) {
    return NextResponse.json(
      {
        success: false,
        message: validation.message,
      },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  try {
    const product = await createAdminProduct(validation.value);

    return NextResponse.json(
      {
        success: true,
        data: product,
      },
      { status: 201, headers: RESPONSE_HEADERS },
    );
  } catch (error) {
    if (error instanceof ProductCategoryNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          message: "The selected category does not exist.",
        },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }

    const code = getDatabaseErrorCode(error);

    if (code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "A product with this slug already exists.",
        },
        { status: 409, headers: RESPONSE_HEADERS },
      );
    }

    console.error("Failed to create product:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create product.",
      },
      {
        status: code === "22P02" || code === "23514" ? 400 : 500,
        headers: RESPONSE_HEADERS,
      },
    );
  }
}
