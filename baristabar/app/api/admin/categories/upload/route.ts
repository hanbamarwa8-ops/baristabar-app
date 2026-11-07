import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "product-images";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

type ImageExtension = "jpg" | "png" | "webp" | "avif";

function detectImageExtension(bytes: Uint8Array): ImageExtension | null {
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }

  // PNG signature
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }

  // WebP: RIFF....WEBP
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "webp";
  }

  // AVIF: ISO BMFF with major brand avif/avis.
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(4, 8)) === "ftyp" &&
    ["avif", "avis"].includes(String.fromCharCode(...bytes.slice(8, 12)))
  ) {
    return "avif";
  }

  return null;
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi(request);

    if (!auth.ok) {
      return auth.response;
    }

    const authorization = request.headers.get("authorization") ?? "";
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];

    if (!token) {
      return jsonError("A valid admin session is required.", 401);
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);

    // Allow a small multipart boundary/header overhead.
    if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_SIZE + 64 * 1024) {
      return jsonError("The image must not exceed 5 MB.", 413);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("No image file was provided.", 400);
    }

    if (file.size <= 0) {
      return jsonError("The selected image is empty.", 400);
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return jsonError("The image must not exceed 5 MB.", 413);
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return jsonError("Use a JPEG, PNG, WebP or AVIF image.", 415);
    }

    const imageBytes = new Uint8Array(await file.arrayBuffer());
    const extension = detectImageExtension(imageBytes);

    if (!extension) {
      return jsonError("The uploaded file is not a supported image.", 415);
    }

    const expectedMimeType: Record<ImageExtension, string> = {
      jpg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      avif: "image/avif",
    };

    if (file.type !== expectedMimeType[extension]) {
      return jsonError("The image content does not match its file type.", 415);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase URL or publishable/anon key for category image upload.");
      return jsonError("Supabase Storage is not configured on the server.", 500);
    }

    let baseUrl: URL;

    try {
      baseUrl = new URL(supabaseUrl);
    } catch {
      return jsonError("The Supabase URL configuration is invalid.", 500);
    }

    if (
      baseUrl.protocol !== "https:" &&
      !(baseUrl.protocol === "http:" && ["localhost", "127.0.0.1"].includes(baseUrl.hostname))
    ) {
      return jsonError("The Supabase URL must use HTTPS.", 500);
    }

    const path = `categories/${randomUUID()}.${extension}`;
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const uploadUrl = new URL(
      `/storage/v1/object/${BUCKET}/${encodedPath}`,
      baseUrl
    );

    const storageResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseKey,
        "Content-Type": expectedMimeType[extension],
        "Cache-Control": "max-age=3600",
        "x-upsert": "false",
      },
      body: file,
      cache: "no-store",
    });

    if (!storageResponse.ok) {
      const storageError = (await storageResponse.json().catch(() => null)) as
        | { message?: string; error?: string }
        | null;

      console.error("Category image Storage upload failed:", {
        status: storageResponse.status,
        message: storageError?.message ?? storageError?.error ?? "Unknown Storage error",
      });

      return jsonError(
        storageError?.message ??
          storageError?.error ??
          "Supabase Storage could not save the category image.",
        storageResponse.status
      );
    }

    const publicUrl = new URL(
      `/storage/v1/object/public/${BUCKET}/${encodedPath}`,
      baseUrl
    ).toString();

    return NextResponse.json(
      {
        success: true,
        message: "Category image uploaded successfully.",
        data: {
          path,
          publicUrl,
          contentType: expectedMimeType[extension],
          size: file.size,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Category image upload route failed:", error);

    return jsonError(
      error instanceof Error
        ? error.message
        : "Unable to upload the category image.",
      500
    );
  }
}
