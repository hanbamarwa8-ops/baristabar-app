import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET_NAME = "product-images";
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const MAX_MULTIPART_OVERHEAD = 64 * 1024;
const CACHE_CONTROL_SECONDS = 3600;

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

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

function detectImageType(bytes: Uint8Array): DetectedImage | null {
  // JPEG
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }

  // PNG
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    ascii(bytes, 1, 4) === "PNG" &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mimeType: "image/png", extension: "png" };
  }

  // WebP
  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 12) === "WEBP"
  ) {
    return { mimeType: "image/webp", extension: "webp" };
  }

  // AVIF: inspect both the major brand and compatible brands in the ftyp box.
  if (bytes.length >= 16 && ascii(bytes, 4, 8) === "ftyp") {
    const majorBrand = ascii(bytes, 8, 12);
    const hasAvifCompatibleBrand = ["avif", "avis"].includes(majorBrand);

    let hasCompatibleAvifBrand = false;

    for (let offset = 16; offset + 4 <= bytes.length; offset += 4) {
      const brand = ascii(bytes, offset, offset + 4);

      if (brand === "avif" || brand === "avis") {
        hasCompatibleAvifBrand = true;
        break;
      }
    }

    if (hasAvifCompatibleBrand || hasCompatibleAvifBrand) {
      return { mimeType: "image/avif", extension: "avif" };
    }
  }

  return null;
}

function getSupabaseConfiguration(): {
  baseUrl: string;
  publishableKey: string;
} | null {
  const configuredUrl = (
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.trim();

  const publishableKey = (
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  if (!configuredUrl || !publishableKey) {
    return null;
  }

  try {
    const url = new URL(configuredUrl);
    const isHttps = url.protocol === "https:";
    const isLocalDevelopment =
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname);

    if (
      (!isHttps && !isLocalDevelopment) ||
      url.username !== "" ||
      url.password !== "" ||
      url.pathname !== "/" ||
      url.search !== "" ||
      url.hash !== ""
    ) {
      return null;
    }

    return {
      baseUrl: url.origin,
      publishableKey,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  // 1. Authenticate the Bearer token and verify the administrator role.
  const auth = await requireAdminApi(request);

  if (!auth.ok) {
    return auth.response;
  }

  const authorization = request.headers.get("authorization");
  const bearerMatch = authorization?.match(/^Bearer\s+(.+)$/i);
  const accessToken = bearerMatch?.[1]?.trim();

  if (!accessToken) {
    return jsonResponse(
      {
        success: false,
        message: "Administrator authentication is required.",
      },
      401,
    );
  }

  // 2. Reject oversized requests before parsing multipart data, when the
  // runtime provides Content-Length. The file limit leaves room for multipart headers.
  const contentLengthHeader = request.headers.get("content-length");

  if (contentLengthHeader !== null) {
    const contentLength = Number(contentLengthHeader);

    if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
      return jsonResponse(
        { success: false, message: "Invalid request content length." },
        400,
      );
    }

    if (contentLength > MAX_FILE_SIZE + MAX_MULTIPART_OVERHEAD) {
      return jsonResponse(
        {
          success: false,
          message: "The upload is too large. Maximum image size is 4 MB.",
        },
        413,
      );
    }
  }

  // 3. Parse multipart form data.
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonResponse(
      { success: false, message: "A valid multipart form is required." },
      400,
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return jsonResponse(
      {
        success: false,
        message: "An image file is required in the 'file' field.",
      },
      400,
    );
  }

  // 4. Validate file size.
  if (file.size === 0) {
    return jsonResponse(
      { success: false, message: "The selected image is empty." },
      400,
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return jsonResponse(
      {
        success: false,
        message: "Image size must not exceed 4 MB.",
      },
      413,
    );
  }

  // 5. Validate the declared MIME type.
  if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
    return jsonResponse(
      { success: false, message: "Unsupported image format." },
      415,
    );
  }

  // 6. Check the file signature. This detects common MIME spoofing but is not
  // a full image decode; the Storage bucket must also enforce its MIME allow-list.
  let detectedImage: DetectedImage | null;

  try {
    const header = new Uint8Array(await file.slice(0, 64).arrayBuffer());
    detectedImage = detectImageType(header);
  } catch {
    return jsonResponse(
      { success: false, message: "Unable to inspect the uploaded image." },
      400,
    );
  }

  if (!detectedImage || detectedImage.mimeType !== file.type) {
    return jsonResponse(
      {
        success: false,
        message: "The image content does not match its declared file format.",
      },
      415,
    );
  }

  // 7. Validate Supabase configuration.
  const supabaseConfig = getSupabaseConfiguration();

  if (!supabaseConfig) {
    console.error("Supabase Storage configuration is missing or invalid.");

    return jsonResponse(
      { success: false, message: "Storage configuration is incomplete." },
      500,
    );
  }

  // 8. Use a random server-generated path. The 'categories' folder is retained
  // for the existing category Storage policies. Never use the client filename.
  const objectPath = `categories/${randomUUID()}.${detectedImage.extension}`;
  const encodedPath = objectPath
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const uploadUrl =
    `${supabaseConfig.baseUrl}/storage/v1/object/` +
    `${BUCKET_NAME}/${encodedPath}`;

  // 9. Upload with the user's verified JWT. Supabase Storage independently
  // evaluates the authenticated user's Storage RLS policies.
  let storageResponse: Response;

  try {
    storageResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseConfig.publishableKey,
        "Content-Type": detectedImage.mimeType,
        "Cache-Control": `max-age=${CACHE_CONTROL_SECONDS}`,
        "x-upsert": "false",
      },
      body: file,
      cache: "no-store",
    });
  } catch (error) {
    console.error("Supabase Storage category image connection failed:", error);

    return jsonResponse(
      { success: false, message: "Unable to connect to image storage." },
      502,
    );
  }

  // 10. Do not expose upstream Storage details to the browser.
  if (!storageResponse.ok) {
    let storageError = "";

    try {
      storageError = (await storageResponse.text()).slice(0, 500);
    } catch {
      // The status code is sufficient for the client response.
    }

    console.error(
      "Category image Storage upload failed:",
      storageResponse.status,
      storageError,
    );

    return jsonResponse(
      {
        success: false,
        message:
          storageResponse.status === 403
            ? "Storage upload not authorized. Check the administrator Storage policies."
            : "Supabase Storage rejected the category image upload.",
      },
      storageResponse.status === 403 ? 403 : 502,
    );
  }

  // 11. Return the public image URL. The category record is saved separately.
  const publicUrl =
    `${supabaseConfig.baseUrl}/storage/v1/object/public/` +
    `${BUCKET_NAME}/${encodedPath}`;

  return jsonResponse(
    {
      success: true,
      message: "Category image uploaded successfully.",
      data: {
        path: objectPath,
        publicUrl,
        contentType: detectedImage.mimeType,
        size: file.size,
      },
    },
    201,
  );
}
