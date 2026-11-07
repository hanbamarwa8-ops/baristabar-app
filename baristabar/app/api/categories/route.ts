
import { NextResponse } from "next/server";
import { findActiveCategories } from "@/lib/categories-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public endpoint used by the client-side storefront navigation.
 * Only active categories are exposed.
 */
export async function GET() {
  try {
    const categories = await findActiveCategories();

    return NextResponse.json(
      {
        success: true,
        data: categories,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Failed to retrieve public categories:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to retrieve categories.",
      },
      { status: 500 },
    );
  }
}
