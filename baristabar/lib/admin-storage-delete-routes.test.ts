
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
  } from "vitest";
  import { NextResponse } from "next/server";

  import { getPool } from "@/lib/db";
  import { requireAdminApi } from "@/lib/require-admin-api";

  import {
    DELETE as deleteProductImage,
  } from "@/app/api/admin/products/image/route";

  import {
    DELETE as deleteCategoryImage,
  } from "@/app/api/admin/categories/image/route";

  vi.mock("@/lib/db", () => ({
    getPool: vi.fn(),
  }));

  vi.mock("@/lib/require-admin-api", () => ({
    requireAdminApi: vi.fn(),
  }));

  const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
  const ACCESS_TOKEN = "valid-admin-access-token";

  const IMAGE_UUID = "550e8400-e29b-41d4-a716-446655440001";

  const deleteRoutes = [
    {
      name: "Product",
      path: `products/${IMAGE_UUID}.png`,
      handler: deleteProductImage,
    },
    {
      name: "Category",
      path: `categories/${IMAGE_UUID}.png`,
      handler: deleteCategoryImage,
    },
  ] as const;

  const mockQuery = vi.fn();

  function createDeleteRequest(
    path: unknown,
    authorization: string | null = `Bearer ${ACCESS_TOKEN}`,
  ): Request {
    const headers = new Headers({
      "Content-Type": "application/json",
    });

    if (authorization) {
      headers.set("Authorization", authorization);
    }

    return new Request(
      "http://localhost:3000/api/admin/image",
      {
        method: "DELETE",
        headers,
        body: JSON.stringify({ path }),
      },
    );
  }

  function authorizeAdmin() {
    vi.mocked(requireAdminApi).mockResolvedValue({
      ok: true,
      userId: USER_ID,
    });
  }

  describe.each(deleteRoutes)(
    "$name image deletion route",
    ({ path, handler }) => {
      beforeEach(() => {
        vi.stubEnv(
          "NEXT_PUBLIC_SUPABASE_URL",
          "https://test-project.supabase.co",
        );

        vi.stubEnv(
          "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
          "sb_publishable_test_key",
        );

        vi.stubGlobal("fetch", vi.fn());

        vi.mocked(fetch).mockReset();
        vi.mocked(requireAdminApi).mockReset();

        mockQuery.mockReset();

        vi.mocked(getPool).mockReturnValue({
          query: mockQuery,
        } as never);

        authorizeAdmin();
      });

      afterEach(() => {
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
        vi.clearAllMocks();
      });

      it("returns 401 when authentication is rejected", async () => {
        vi.mocked(requireAdminApi).mockResolvedValueOnce({
          ok: false,
          response: NextResponse.json(
            {
              success: false,
              message: "Authentication required.",
            },
            { status: 401 },
          ),
        });

        const response = await handler(
          createDeleteRequest(path),
        );

        expect(response.status).toBe(401);
        expect(mockQuery).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
      });

      it("returns 403 when the user is not an administrator", async () => {
        vi.mocked(requireAdminApi).mockResolvedValueOnce({
          ok: false,
          response: NextResponse.json(
            {
              success: false,
              message: "Not authorized.",
            },
            { status: 403 },
          ),
        });

        const response = await handler(
          createDeleteRequest(path),
        );

        expect(response.status).toBe(403);
        expect(mockQuery).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
      });

      it("returns 401 when the Bearer token is missing", async () => {
        const response = await handler(
          createDeleteRequest(path, null),
        );

        expect(response.status).toBe(401);
        expect(mockQuery).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
      });

      it("rejects an invalid image path", async () => {
        const response = await handler(
          createDeleteRequest("../unauthorized/image.png"),
        );

        expect(response.status).toBe(400);
        expect(mockQuery).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
      });

      it("rejects an image URL from another origin", async () => {
        const externalUrl =
          `https://evil.example/storage/v1/object/public/` +
          `product-images/${path}`;

        const response = await handler(
          createDeleteRequest(externalUrl),
        );

        expect(response.status).toBe(400);
        expect(mockQuery).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
      });

      it("returns 409 when the image is still referenced", async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{ count: 1 }],
        });

        const response = await handler(
          createDeleteRequest(path),
        );

        expect(response.status).toBe(409);
        expect(mockQuery).toHaveBeenCalledTimes(1);

        // Both routes must check product and category references.
        const executedQuery = String(
          mockQuery.mock.calls[0]?.[0] ?? "",
        );

        expect(executedQuery).toContain("FROM public.products");
        expect(executedQuery).toContain("FROM public.categories");

        // Storage deletion must not happen when the image is referenced.
        expect(fetch).not.toHaveBeenCalled();
      });

      it("returns 500 when the reference database query fails", async () => {
        mockQuery.mockRejectedValueOnce(
          new Error("Simulated database failure"),
        );

        const response = await handler(
          createDeleteRequest(path),
        );

        expect(response.status).toBe(500);
        expect(fetch).not.toHaveBeenCalled();
      });

      it("deletes an unused image from the correct Storage bucket", async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{ count: 0 }],
        });

        vi.mocked(fetch).mockResolvedValueOnce(
          new Response(null, { status: 200 }),
        );

        const response = await handler(
          createDeleteRequest(path),
        );

        expect(response.status).toBe(200);

        const result = await response.json();

        expect(result.success).toBe(true);
        expect(result.data.path).toBe(path);

        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledTimes(1);

        const call = vi.mocked(fetch).mock.calls[0];

        expect(call).toBeDefined();

        const [url, options] = call!;

        expect(String(url)).toBe(
          "https://test-project.supabase.co/storage/v1/object/product-images",
        );

        expect(options?.method).toBe("DELETE");

        const headers = new Headers(options?.headers);

        expect(headers.get("Authorization")).toBe(
          `Bearer ${ACCESS_TOKEN}`,
        );

        expect(headers.get("apikey")).toBe(
          "sb_publishable_test_key",
        );

        expect(JSON.parse(String(options?.body))).toEqual({
          prefixes: [path],
        });
      });

      it("returns 502 when Supabase Storage refuses the deletion", async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{ count: 0 }],
        });

        vi.mocked(fetch).mockResolvedValueOnce(
          new Response("Storage deletion rejected", {
            status: 403,
          }),
        );

        const response = await handler(
          createDeleteRequest(path),
        );

        expect(response.status).toBe(502);
        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledTimes(1);
      });
    },
  );
