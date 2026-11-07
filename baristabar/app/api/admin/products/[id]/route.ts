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

type RouteContext = {
  params: Promise<{ id: string }>;
};

// PUT
// Update an existing product.
export async function PUT(
  request: Request,
  context: RouteContext,
) {
  // 1. Verify administrator authentication.

  const auth = await requireAdminApi(request);

  if (!auth.ok) {
    return auth.response;
  }

  // 2. Validate product ID.

  const { id } = await context.params;

  if (!isValidProductId(id)) {
    return NextResponse.json(
      {
        success: false,
        message: "A valid product ID is required.",
      },
      { status: 400 },
    );
  }

  // 3. Parse request body.

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "A valid JSON body is required.",
      },
      { status: 400 },
    );
  }

  // 4. Validate product data.

  const validation = validateProductPayload(body);

  if (!validation.ok) {
    return NextResponse.json(
      {
        success: false,
        message: validation.message,
      },
      { status: 400 },
    );
  }

  // 5. Update product.

  try {
    const product = await updateAdminProduct(
      id,
      validation.value,
    );

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Product updated successfully.",
      data: product,
    });
  } catch (error) {
    if (error instanceof ProductCategoryNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          message: "The selected category does not exist.",
        },
        { status: 400 },
      );
    }

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

    if (code === "22P02" || code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid product data.",
        },
        { status: 400 },
      );
    }

    console.error("Failed to update admin product:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update product.",
      },
      { status: 500 },
    );
  }
}

// DELETE
// Delete a product only if no historical order references it.
export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  // 1. Verify administrator authentication.

  const auth = await requireAdminApi(request);

  if (!auth.ok) {
    return auth.response;
  }

  // 2. Validate product ID.

  const { id } = await context.params;

  if (!isValidProductId(id)) {
    return NextResponse.json(
      {
        success: false,
        message: "A valid product ID is required.",
      },
      { status: 400 },
    );
  }

  // 3. Delete product.

  try {
    const deletedProduct = await deleteAdminProduct(id);

    if (!deletedProduct) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully.",
      data: {
        id: deletedProduct.id,
        image_url: deletedProduct.image_url,
      },
    });
  } catch (error) {
    const code = getDatabaseErrorCode(error);

    // Preserve historical orders.
    // PostgreSQL foreign key violation.

    if (code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This product cannot be deleted because it is referenced by existing orders. Deactivate it instead.",
        },
        { status: 409 },
      );
    }

    console.error("Failed to delete admin product:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to delete product.",
      },
      { status: 500 },
    );
  }
}
