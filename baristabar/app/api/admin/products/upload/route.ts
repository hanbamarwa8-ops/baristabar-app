import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CONFIGURATION
const BUCKET_NAME = "product-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

interface DetectedImage {
  mimeType: AllowedMimeType;
  extension: string;
}

// IMAGE SIGNATURE VALIDATION
function detectImageType(bytes: Uint8Array): DetectedImage | null {
  // JPEG
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return {
      mimeType: "image/jpeg",
      extension: "jpg",
    };
  }

  // PNG
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
    return {
      mimeType: "image/png",
      extension: "png",
    };
  }

  // WebP
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return {
      mimeType: "image/webp",
      extension: "webp",
    };
  }

  // AVIF
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(4, 8)) === "ftyp" &&
    ["avif", "avis"].includes(
      String.fromCharCode(...bytes.slice(8, 12)),
    )
  ) {
    return {
      mimeType: "image/avif",
      extension: "avif",
    };
  }

  return null;
}


// POST /api/admin/products/upload
// Upload an image to the Supabase Storage bucket.
// Requires an authenticated administrator.
export async function POST(request: Request) {
  // 1. Verify administrator access.

  const auth = await requireAdminApi(request);

  if (!auth.ok) {
    return auth.response;
  }

  // 2. Extract the verified user's Bearer token.

  const authorization = request.headers.get("authorization");

  if (!authorization?.match(/^Bearer\s+\S+$/i)) {
    return NextResponse.json(
      {
        success: false,
        message: "Administrator authentication is required.",
      },
      { status: 401 },
    );
  }

  // 3. Check file size from Content-Length when available.

  const contentLength = Number(
    request.headers.get("content-length") ?? 0,
  );

  if (contentLength > MAX_FILE_SIZE + 64 * 1024) {
    return NextResponse.json(
      {
        success: false,
        message: "The upload is too large. Maximum size is 5 MB.",
      },
      { status: 413 },
    );
  }

  // 4. Read multipart form data.

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "A valid multipart form is required.",
      },
      { status: 400 },
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        success: false,
        message: "An image file is required in the 'file' field.",
      },
      { status: 400 },
    );
  }

  // 5. Validate file size.

  if (file.size === 0) {
    return NextResponse.json(
      {
        success: false,
        message: "The selected image is empty.",
      },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        success: false,
        message: "Image size must not exceed 5 MB.",
      },
      { status: 413 },
    );
  }

  // 6. Validate declared MIME type.

  if (
    !ALLOWED_MIME_TYPES.includes(
      file.type as AllowedMimeType,
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Unsupported image format.",
      },
      { status: 415 },
    );
  }

  // 7. Verify the actual image signature.

  let detectedImage: DetectedImage | null;

  try {
    const header = new Uint8Array(
      await file.slice(0, 16).arrayBuffer(),
    );

    detectedImage = detectImageType(header);
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Unable to inspect the uploaded image.",
      },
      { status: 400 },
    );
  }

  if (
    !detectedImage ||
    detectedImage.mimeType !== file.type
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "The image content does not match its declared file format.",
      },
      { status: 415 },
    );
  }

  // 8. Read Supabase public configuration.

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    console.error(
      "Missing Supabase URL or publishable API key.",
    );

    return NextResponse.json(
      {
        success: false,
        message: "Storage configuration is incomplete.",
      },
      { status: 500 },
    );
  }

  let baseUrl: string;

  try {
    const parsedUrl = new URL(supabaseUrl);

    if (
      parsedUrl.protocol !== "https:" &&
      parsedUrl.hostname !== "localhost"
    ) {
      throw new Error("Invalid Supabase URL protocol.");
    }

    baseUrl = parsedUrl.origin;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid Supabase configuration.",
      },
      { status: 500 },
    );
  }

  // 9. Generate a unique storage object path.
  // The products folder is required by the Storage RLS policies.

  const objectPath =
    `products/${randomUUID()}.${detectedImage.extension}`;

  const encodedPath = objectPath
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const uploadUrl =
    `${baseUrl}/storage/v1/object/` +
    `${BUCKET_NAME}/${encodedPath}`;

  // 10. Upload using the authenticated user's token.
  // Supabase Storage RLS checks the administrator profile.

  let storageResponse: Response;

  try {
    storageResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: authorization,
        apikey: supabasePublishableKey,
        "Content-Type": detectedImage.mimeType,
        "Cache-Control": "3600",
        "x-upsert": "false",
      },
      body: file,
      cache: "no-store",
    });
  } catch (error) {
    console.error(
      "Supabase Storage connection failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to connect to image storage.",
      },
      { status: 502 },
    );
  }

  // 11. Handle Storage errors.

  if (!storageResponse.ok) {
    const storageError = await storageResponse.text();

    console.error(
      "Supabase Storage upload rejected:",
      storageResponse.status,
      storageError,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          storageResponse.status === 403
            ? "Storage upload not authorized. Check the administrator Storage policies."
            : "Supabase Storage rejected the image upload.",
      },
      {
        status:
          storageResponse.status === 403 ? 403 : 502,
      },
    );
  }

  // 12. Build the public image URL.

  const publicUrl =
    `${baseUrl}/storage/v1/object/public/` +
    `${BUCKET_NAME}/${encodedPath}`;

  // 13. Return upload result.
  // The product's image_url will be saved separately
  // when the administrator creates or updates the product.

  return NextResponse.json(
    {
      success: true,
      message: "Product image uploaded successfully.",
      data: {
        path: objectPath,
        publicUrl,
        contentType: detectedImage.mimeType,
        size: file.size,
      },
    },
    { status: 201 },
  );
}
