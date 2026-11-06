
import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/require-admin-api";

import {
  createAdminCategory,
  findAllAdminCategories,
  getDatabaseErrorCode,
  validateCategoryPayload,
} from "@/lib/admin-categories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET <=> Retrieve all categories for the admin dashboard.

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const categories = await findAllAdminCategories();

    return NextResponse.json(
      {
        success: true,
        data: categories,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Failed to retrieve admin categories:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to retrieve categories.",
      },
      { status: 500 },
    );
  }
}

// POST<=>Create a new category.
export async function POST(request: Request) {
  const auth = await requireAdminApi(request);

  if (!auth.ok) {
    return auth.response;
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

  // Validate incoming category data.

  const validation = validateCategoryPayload(body);

  if (!validation.ok) {
    return NextResponse.json(
      {
        success: false,
        message: validation.message,
      },
      { status: 400 },
    );
  }

  try {
    const category = await createAdminCategory(
      validation.value,
    );

    return NextResponse.json(
      {
        success: true,
        message: "Category created successfully.",
        data: category,
      },
      { status: 201 },
    );
  } catch (error) {
    const code = getDatabaseErrorCode(error);

    // Duplicate category name or slug.

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

    // Invalid database data.

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
      "Failed to create admin category:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create category.",
      },
      { status: 500 },
    );
  }
}
