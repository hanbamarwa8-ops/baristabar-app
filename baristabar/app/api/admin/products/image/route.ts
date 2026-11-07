import { NextResponse } from "next/server";

import { getPool } from "@/lib/db";
import { requireAdminApi } from "@/lib/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "product-images";

const IMAGE_PATH_REGEX =
  /^products\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|avif)$/i;

function getAccessToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);

  return match?.[1]?.trim() || null;
}

function resolveImagePath(
  value: unknown,
  supabaseUrl: string,
): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const input = value.trim();
  let path = input;

  if (/^https?:\/\//i.test(input)) {
    try {
      const imageUrl = new URL(input);
      const expectedOrigin = new URL(supabaseUrl).origin;

      if (imageUrl.origin !== expectedOrigin) {
        return null;
      }

      const prefix = `/storage/v1/object/public/${BUCKET}/`;

      if (!imageUrl.pathname.startsWith(prefix)) {
        return null;
      }

      path = decodeURIComponent(
        imageUrl.pathname.slice(prefix.length),
      );
    } catch {
      return null;
    }
  }

  if (!IMAGE_PATH_REGEX.test(path)) {
    return null;
  }

  return path;
}

export async function DELETE(request: Request) {
  try {
    // Vérification de l'administrateur.
    const authResult = await requireAdminApi(request);

    // En cas d'échec, requireAdminApi renvoie une réponse HTTP.
    // En cas de succès, il renvoie { ok: true, userId }.
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const accessToken = getAccessToken(request);

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentification requise.",
        },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);

    if (
      !body ||
      typeof body !== "object" ||
      !("path" in body)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Le chemin de l'image est obligatoire.",
        },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Configuration Supabase manquante.",
        },
        { status: 500 },
      );
    }

    const imagePath = resolveImagePath(body.path, supabaseUrl);

    if (!imagePath) {
      return NextResponse.json(
        {
          success: false,
          message: "Chemin d'image invalide ou non autorisé.",
        },
        { status: 400 },
      );
    }

    const normalizedSupabaseUrl = supabaseUrl.replace(/\/$/, "");

    const publicImageUrl =
      `${normalizedSupabaseUrl}/storage/v1/object/public/` +
      `${BUCKET}/${imagePath}`;

    const imagePathMarker =
      `/storage/v1/object/public/${BUCKET}/${imagePath}`;

    // Vérifier qu'aucun produit n'utilise encore cette image.
    const pool = getPool();

    const referenceResult = await pool.query<{ count: number }>(
      `
        SELECT COUNT(*)::int AS count
        FROM public.products
        WHERE image_url = $1
           OR image_url = $2
           OR POSITION($3 IN image_url) > 0
      `,
      [publicImageUrl, imagePath, imagePathMarker],
    );

    if (referenceResult.rows[0]?.count > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cette image est encore utilisée par un produit. " +
            "Elle ne peut pas être supprimée.",
          code: "IMAGE_IN_USE",
        },
        { status: 409 },
      );
    }

    // Suppression dans Supabase Storage.
    const storageResponse = await fetch(
      `${normalizedSupabaseUrl}/storage/v1/object/${BUCKET}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: supabaseKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prefixes: [imagePath],
        }),
        cache: "no-store",
      },
    );

    if (!storageResponse.ok) {
      const errorBody = await storageResponse.text();

      console.error(
        "Supabase Storage image deletion failed:",
        storageResponse.status,
        errorBody,
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de supprimer l'image dans Supabase Storage.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Image supprimée avec succès.",
      data: {
        path: imagePath,
      },
    });
  } catch (error) {
    console.error("Admin product image deletion error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Une erreur est survenue pendant la suppression de l'image.",
      },
      { status: 500 },
    );
  }
}