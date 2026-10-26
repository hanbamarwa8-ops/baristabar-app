
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
  } from "vitest";
  
  import { getPool } from "@/lib/db";
  import { requireAdminApi } from "@/lib/require-admin-api";
  
  vi.mock("@/lib/db", () => ({
    getPool: vi.fn(),
  }));
  
  const mockQuery = vi.fn();
  
  const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
  
  function mockSupabaseUserResponse(
    status: number,
    body: unknown,
  ) {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }
  
  function getResponseStatus(
    result: Awaited<ReturnType<typeof requireAdminApi>>,
  ) {
    return result.ok ? null : result.response.status;
  }
  
  describe("requireAdminApi", () => {
    beforeEach(() => {
      vi.stubEnv(
        "NEXT_PUBLIC_SUPABASE_URL",
        "https://test-project.supabase.co",
      );
      vi.stubEnv(
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        "sb_publishable_test_key",
      );
  
      mockQuery.mockReset();
      vi.mocked(getPool).mockReturnValue({
        query: mockQuery,
      } as never);
  
      vi.stubGlobal("fetch", vi.fn());
    });
  
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
      vi.clearAllMocks();
    });
  
    it("returns 401 when the Authorization header is missing", async () => {
      const request = new Request(
        "http://localhost:3000/api/admin/products",
      );
  
      const result = await requireAdminApi(request);
  
      expect(getResponseStatus(result)).toBe(401);
      expect(fetch).not.toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  
    it("returns 401 when Supabase rejects an invalid or expired access token", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: "Invalid JWT" }),
          { status: 401 },
        ),
      );
  
      const request = new Request(
        "http://localhost:3000/api/admin/products",
        {
          headers: {
            Authorization: "Bearer invalid-or-expired-token",
          },
        },
      );
  
      const result = await requireAdminApi(request);
  
      expect(getResponseStatus(result)).toBe(401);
      expect(mockQuery).not.toHaveBeenCalled();
    });
  
    it("returns 403 when the authenticated user is a customer", async () => {
      mockSupabaseUserResponse(200, { id: USER_ID });
      mockQuery.mockResolvedValueOnce({
        rows: [{ role: "customer" }],
      });
  
      const request = new Request(
        "http://localhost:3000/api/admin/products",
        {
          headers: {
            Authorization: "Bearer valid-customer-access-token",
          },
        },
      );
  
      const result = await requireAdminApi(request);
  
      expect(getResponseStatus(result)).toBe(403);
    });
  
    it("allows an authenticated administrator", async () => {
      mockSupabaseUserResponse(200, { id: USER_ID });
      mockQuery.mockResolvedValueOnce({
        rows: [{ role: "admin" }],
      });
  
      const request = new Request(
        "http://localhost:3000/api/admin/products",
        {
          headers: {
            Authorization: "Bearer valid-admin-access-token",
          },
        },
      );
  
      const result = await requireAdminApi(request);
  
      expect(result).toEqual({
        ok: true,
        userId: USER_ID,
      });
    });
  
    it("fails closed when the profile database query fails", async () => {
      mockSupabaseUserResponse(200, { id: USER_ID });
      mockQuery.mockRejectedValueOnce(
        new Error("Simulated database failure"),
      );
  
      const request = new Request(
        "http://localhost:3000/api/admin/products",
        {
          headers: {
            Authorization: "Bearer valid-admin-access-token",
          },
        },
      );
  
      const result = await requireAdminApi(request);
  
      expect(getResponseStatus(result)).toBe(500);
    });
  });
  