import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/require-admin-api";
import { POST as uploadProductImage } from "@/app/api/admin/products/upload/route";
import { POST as uploadCategoryImage } from "@/app/api/admin/categories/upload/route";

vi.mock("@/lib/require-admin-api", () => ({
  requireAdminApi: vi.fn(),
}));

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const MAX_MULTIPART_OVERHEAD = 64 * 1024;
const ACCESS_TOKEN = "valid-admin-access-token";
const PUBLISHABLE_KEY = "sb_publishable_test_key";
const SUPABASE_URL = "https://test-project.supabase.co";

const PNG_SIGNATURE = [
  0x89, 0x50, 0x4e, 0x47,
  0x0d, 0x0a, 0x1a, 0x0a,
];

function createImageFile(
  type = "image/png",
  size = 16,
  signature: number[] = PNG_SIGNATURE,
): File {
  const buffer = new ArrayBuffer(size);
  const bytes = new Uint8Array(buffer);

  bytes.set(signature.slice(0, size));

  return new File([buffer], "test-image.png", { type });
}

function createUploadRequest(
  file?: File,
  authorization: string | null = `Bearer ${ACCESS_TOKEN}`,
  contentLength?: string,
): Request {
  const formData = new FormData();

  if (file) {
    formData.append("file", file);
  }

  const headers = new Headers();

  if (authorization) {
    headers.set("Authorization", authorization);
  }

  if (contentLength !== undefined) {
    headers.set("Content-Length", contentLength);
  }

  return new Request("http://localhost:3000/api/admin/image/upload", {
    method: "POST",
    headers,
    body: formData,
  });
}

function authorizeAdmin() {
  vi.mocked(requireAdminApi).mockResolvedValue({
    ok: true,
    userId: USER_ID,
  });
}

const uploadRoutes = [
  {
    name: "Product",
    folder: "products",
    handler: uploadProductImage,
  },
  {
    name: "Category",
    folder: "categories",
    handler: uploadCategoryImage,
  },
];

describe.each(uploadRoutes)(
  "$name image upload route",
  ({ folder, handler }) => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", PUBLISHABLE_KEY);

      vi.stubGlobal("fetch", vi.fn());
      vi.mocked(fetch).mockReset();
      vi.mocked(requireAdminApi).mockReset();

      authorizeAdmin();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
      vi.clearAllMocks();
    });

    it("rejects requests without administrator authorization", async () => {
      vi.mocked(requireAdminApi).mockResolvedValueOnce({
        ok: false,
        response: NextResponse.json(
          { success: false, message: "Authentication required." },
          { status: 401 },
        ),
      });

      const response = await handler(
        createUploadRequest(createImageFile(), null),
      );

      expect(response.status).toBe(401);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("returns 401 when the Bearer header is missing", async () => {
      const response = await handler(
        createUploadRequest(createImageFile(), null),
      );

      expect(response.status).toBe(401);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("rejects an invalid Content-Length header", async () => {
      const response = await handler(
        createUploadRequest(createImageFile(), undefined, "not-a-number"),
      );

      expect(response.status).toBe(400);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("rejects requests exceeding the multipart request-size allowance", async () => {
      const contentLength = String(
        MAX_FILE_SIZE + MAX_MULTIPART_OVERHEAD + 1,
      );

      const response = await handler(
        createUploadRequest(createImageFile(), undefined, contentLength),
      );

      expect(response.status).toBe(413);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("rejects an image larger than 4 MB", async () => {
      const file = createImageFile("image/png", MAX_FILE_SIZE + 1);

      const response = await handler(createUploadRequest(file));

      expect(response.status).toBe(413);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("rejects unsupported MIME types", async () => {
      const file = createImageFile("image/gif");

      const response = await handler(createUploadRequest(file));

      expect(response.status).toBe(415);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("rejects an image whose actual signature does not match its MIME type", async () => {
      const jpegSignature = [0xff, 0xd8, 0xff];
      const file = createImageFile("image/png", 16, jpegSignature);

      const response = await handler(createUploadRequest(file));

      expect(response.status).toBe(415);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("returns 400 when no image is provided", async () => {
      const response = await handler(createUploadRequest());

      expect(response.status).toBe(400);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("returns 400 when the selected image is empty", async () => {
      const response = await handler(
        createUploadRequest(createImageFile("image/png", 0)),
      );

      expect(response.status).toBe(400);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("uploads a PNG-signature file to the correct Storage folder", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(null, { status: 200 }),
      );

      const response = await handler(
        createUploadRequest(createImageFile()),
      );

      expect(response.status).toBe(201);

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.path).toMatch(
        new RegExp(`^${folder}/[0-9a-f-]+\\.png$`, "i"),
      );
      expect(result.data.publicUrl).toContain(
        `/storage/v1/object/public/product-images/${folder}/`,
      );

      expect(fetch).toHaveBeenCalledTimes(1);

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      expect(fetchCall).toBeDefined();

      const [url, options] = fetchCall!;

      expect(String(url)).toContain(
        `/storage/v1/object/product-images/${folder}/`,
      );

      const headers = new Headers(options?.headers);

      expect(headers.get("Authorization")).toBe(`Bearer ${ACCESS_TOKEN}`);
      expect(headers.get("apikey")).toBe(PUBLISHABLE_KEY);
      expect(headers.get("Content-Type")).toBe("image/png");
      expect(headers.get("Cache-Control")).toBe("max-age=3600");
      expect(options?.cache).toBe("no-store");
    });

    it("accepts a file with a PNG signature exactly at the 4 MB limit", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(null, { status: 200 }),
      );

      const response = await handler(
        createUploadRequest(createImageFile("image/png", MAX_FILE_SIZE)),
      );

      expect(response.status).toBe(201);
      expect(fetch).toHaveBeenCalledOnce();
    });

    it("does not expose Supabase Storage details when the upload is forbidden", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response("Storage policy denied", { status: 403 }),
      );

      const response = await handler(
        createUploadRequest(createImageFile()),
      );
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.message).not.toContain("Storage policy denied");
    });

    it("returns 502 when Supabase Storage fails with a server error", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response("Internal Storage details", { status: 500 }),
      );

      const response = await handler(
        createUploadRequest(createImageFile()),
      );
      const body = await response.json();

      expect(response.status).toBe(502);
      expect(body.success).toBe(false);
      expect(body.message).not.toContain("Internal Storage details");
    });

    it("returns 502 when the Storage service cannot be reached", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network unavailable"));

      const response = await handler(
        createUploadRequest(createImageFile()),
      );

      expect(response.status).toBe(502);
      expect(await response.json()).toMatchObject({ success: false });
    });
  },
);
