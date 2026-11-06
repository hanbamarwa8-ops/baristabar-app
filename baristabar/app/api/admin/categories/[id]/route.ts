import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/require-admin-api";

import {
  deleteAdminCategory,
  findAdminCategoryById,
  getDatabaseErrorCode,
  isValidCategoryId,
  updateAdminCategory,
  validateCategoryPayload,
} from "@/lib/admin-categories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};


// GET
// Retrieve one category.
export async function GET(
  request: Request,
  context: RouteContext,
) {
  const auth = await requireAdminApi(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;

  if (!isValidCategoryId(id)) {
    return NextResponse.json(
      {
        success: false,
        message: "A valid category ID is required.",
      },
      { status: 400 },
    );
  }

  try {
    const category = await findAdminCategoryById(id);

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message: "Category not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: category,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Failed to retrieve admin category:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to retrieve category.",
      },
      { status: 500 },
    );
  }
}

// PATCH 
// Partially update a category.
export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  const auth = await requireAdminApi(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;

  if (!isValidCategoryId(id)) {
    return NextResponse.json(
      {
        success: false,
        message: "A valid category ID is required.",
      },
      { status: 400 },
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
      { status: 400 },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "A valid category object is required.",
      },
      { status: 400 },
    );
  }

  try {
    // Retrieve the current category to preserve
    // fields that are not included in the PATCH body.

    const existingCategory = await findAdminCategoryById(id);

    if (!existingCategory) {
      return NextResponse.json(
        {
          success: false,
          message: "Category not found.",
        },
        { status: 404 },
      );
    }

    const mergedPayload = {
      name: existingCategory.name,
      slug: existingCategory.slug,
      description: existingCategory.description,
      image_url: existingCategory.image_url,
      is_active: existingCategory.is_active,
      sort_order: existingCategory.sort_order,
      ...body,
    };

    const validation =
      validateCategoryPayload(mergedPayload);

    if (!validation.ok) {
      return NextResponse.json(
        {
          success: false,
          message: validation.message,
        },
        { status: 400 },
      );
    }

    const category = await updateAdminCategory(
      id,
      validation.value,
    );

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message: "Category not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Category updated successfully.",
      data: category,
    });
  } catch (error) {
    const code = getDatabaseErrorCode(error);

    if (code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message:
            "A category with this name or slug already exists.",
        },
        { status: 409 },
      );
    }

    if (code === "22P02" || code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid category data.",
        },
        { status: 400 },
      );
    }

    console.error(
      "Failed to update admin category:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update category.",
      },
      { status: 500 },
    );
  }
}

// DELETE 
// Delete a category only if no products use it.

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  const auth = await requireAdminApi(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;

  if (!isValidCategoryId(id)) {
    return NextResponse.json(
      {
        success: false,
        message: "A valid category ID is required.",
      },
      { status: 400 },
    );
  }

  try {
    const deleted = await deleteAdminCategory(id);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          message: "Category not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully.",
    });
  } catch (error) {
    const code = getDatabaseErrorCode(error);

    // PostgreSQL foreign key violation:
    // the category is still associated with products.

    if (code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This category cannot be deleted because products are still associated with it. Reassign or archive those products first.",
        },
        { status: 409 },
      );
    }

    console.error(
      "Failed to delete admin category:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to delete category.",
      },
      { status: 500 },
    );
  }
}
