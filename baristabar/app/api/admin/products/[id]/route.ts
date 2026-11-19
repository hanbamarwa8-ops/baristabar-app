import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/require-admin-api";

import {
  deleteAdminProduct,
  getDatabaseErrorCode,
  isValidProductId,
  ProductCategoryNotFoundError,
  updateAdminProduct,
  validateProductPayload,
} from "@/lib/admin-products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(
  request: Request,
  context: RouteContext,
) {
  const auth = await requireAdminApi(request);

  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  if (!isValidProductId(id)) {
    return NextResponse.json(
      {
        success: false,
        message: "A valid product ID is required.",
      },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

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
    const product = await updateAdminProduct(id, validation.value);

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found.",
        },
        { status: 404, headers: RESPONSE_HEADERS },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Product updated successfully.",
        data: product,
      },
      { headers: RESPONSE_HEADERS },
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

    console.error("Failed to update admin product:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          code === "22P02" || code === "23514"
            ? "Invalid product data."
            : "Unable to update product.",
      },
      {
        status: code === "22P02" || code === "23514" ? 400 : 500,
        headers: RESPONSE_HEADERS,
      },
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  const auth = await requireAdminApi(request);

  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  if (!isValidProductId(id)) {
    return NextResponse.json(
      {
        success: false,
        message: "A valid product ID is required.",
      },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  try {
    const deletedProduct = await deleteAdminProduct(id);

    if (!deletedProduct) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found.",
        },
        { status: 404, headers: RESPONSE_HEADERS },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Product deleted successfully.",
        data: {
          id: deletedProduct.id,
          image_url: deletedProduct.image_url,
        },
      },
      { headers: RESPONSE_HEADERS },
    );
  } catch (error) {
    const code = getDatabaseErrorCode(error);

    if (code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This product cannot be deleted because it is referenced by existing orders. Deactivate it instead.",
        },
        { status: 409, headers: RESPONSE_HEADERS },
      );
    }

    console.error("Failed to delete admin product:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to delete product.",
      },
      { status: 500, headers: RESPONSE_HEADERS },
    );
  }
}
