import { NextResponse } from "next/server";
import { findActiveProducts } from "@/lib/products-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await findActiveProducts();

    return NextResponse.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Failed to retrieve products:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to retrieve products.",
      },
      { status: 500 },
    );
  }
}