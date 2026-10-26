import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

type AdminAuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

export async function requireAdminApi(
  request: Request,
): Promise<AdminAuthResult> {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  const accessToken = match?.[1]?.trim();

  if (!accessToken) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, message: "Authentication is required." },
        { status: 401 },
      ),
    };
  }

  const supabaseUrl = (
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.trim().replace(/\/+$/, "");

  const publishableKey = (
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )?.trim();

  if (!supabaseUrl || !publishableKey) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Supabase authentication is not configured.",
        },
        { status: 500 },
      ),
    };
  }

  let userId: string;

  try {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (authResponse.status === 401 || authResponse.status === 403) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            success: false,
            message: "Your session is invalid or expired. Please sign in again.",
          },
          { status: 401 },
        ),
      };
    }

    if (!authResponse.ok) {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, message: "Unable to verify the session." },
          { status: 502 },
        ),
      };
    }

    const user: { id?: unknown } = await authResponse.json();

    if (typeof user.id !== "string") {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, message: "Invalid authenticated user." },
          { status: 401 },
        ),
      };
    }

    userId = user.id;
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, message: "Unable to verify the session." },
        { status: 502 },
      ),
    };
  }

  try {
    const result = await getPool().query<{ role: string }>(
      "SELECT role FROM public.profiles WHERE id = $1::uuid",
      [userId],
    );

    if (result.rows[0]?.role !== "admin") {
      return {
        ok: false,
        response: NextResponse.json(
          {
            success: false,
            message: "This account is not authorized to manage products.",
          },
          { status: 403 },
        ),
      };
    }

    return { ok: true, userId };
  } catch (error) {
    console.error("Admin role verification failed:", error);

    return {
      ok: false,
      response: NextResponse.json(
        { success: false, message: "Unable to verify administrator access." },
        { status: 500 },
      ),
    };
  }
}