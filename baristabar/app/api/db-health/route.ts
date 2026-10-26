import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getPool().query(
      "SELECT NOW() AS server_time",
    );

    return NextResponse.json({
      status: "ok",
      message: "PostgreSQL connection successful",
      serverTime: result.rows[0].server_time,
    });
  } catch (error) {
    console.error("PostgreSQL health check failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Database connection failed. Check the server configuration.",
      },
      { status: 500 },
    );
  }
}