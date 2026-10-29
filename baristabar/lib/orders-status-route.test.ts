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
  import { PATCH } from "@/app/api/admin/orders/[id]/route";
  
  vi.mock("@/lib/db", () => ({
    getPool: vi.fn(),
  }));
  
  vi.mock("@/lib/require-admin-api", () => ({
    requireAdminApi: vi.fn(),
  }));
  
  type TestStatus =
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
  
  const ORDER_ID = "550e8400-e29b-41d4-a716-446655440000";
  const ADMIN_ID = "660e8400-e29b-41d4-a716-446655440000";
  
  const mockQuery = vi.fn();
  const mockRelease = vi.fn();
  const mockConnect = vi.fn();
  
  const mockClient = {
    query: mockQuery,
    release: mockRelease,
  };
  
  let storedOrderStatus: TestStatus;
  let orderExists: boolean;
  let failStockRestoration: boolean;
  
  function normaliseSql(query: string): string {
    return query.replace(/\s+/g, " ").trim();
  }
  
  function configureDatabaseMock() {
    mockQuery.mockImplementation(
      async (query: string, values?: unknown[]) => {
        const sql = normaliseSql(query);
  
        if (sql.startsWith("SELECT id::text, status FROM public.orders")) {
          return {
            rows: orderExists
              ? [{ id: ORDER_ID, status: storedOrderStatus }]
              : [],
            rowCount: orderExists ? 1 : 0,
          };
        }
  
        if (sql.startsWith("WITH stock_requirements AS")) {
          if (failStockRestoration) {
            throw new Error("Simulated stock restoration failure");
          }
  
          return {
            rows: [],
            rowCount: 1,
          };
        }
  
        if (sql.startsWith("UPDATE public.orders SET status = $2")) {
          storedOrderStatus = values?.[1] as TestStatus;
  
          return {
            rows: [{ id: ORDER_ID, status: storedOrderStatus }],
            rowCount: 1,
          };
        }
  
        // BEGIN, COMMIT et ROLLBACK.
        return {
          rows: [],
          rowCount: null,
        };
      },
    );
  }
  
  function makeRequest(body: unknown, id = ORDER_ID): Request {
    return new Request(
      `http://localhost:3000/api/admin/orders/${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
  }
  
  async function callPatch(body: unknown, id = ORDER_ID) {
    return PATCH(makeRequest(body, id), {
      params: Promise.resolve({ id }),
    });
  }
  
  async function responseBody(response: Response) {
    return response.json() as Promise<{
      success?: boolean;
      message?: string;
      data?: {
        id: string;
        status: string;
      };
    }>;
  }
  
  describe("PATCH /api/admin/orders/[id]", () => {
    beforeEach(() => {
      vi.clearAllMocks();
  
      storedOrderStatus = "pending";
      orderExists = true;
      failStockRestoration = false;
  
      mockQuery.mockReset();
      mockRelease.mockReset();
      mockConnect.mockReset();
  
      mockConnect.mockResolvedValue(mockClient);
      configureDatabaseMock();
  
      vi.mocked(getPool).mockReset();
      vi.mocked(getPool).mockReturnValue({
        connect: mockConnect,
      } as never);
  
      vi.mocked(requireAdminApi).mockReset();
      vi.mocked(requireAdminApi).mockResolvedValue({
        ok: true,
        userId: ADMIN_ID,
      });
    });
  
    afterEach(() => {
      vi.restoreAllMocks();
    });
  
    it("refuses access when the administrator is not authenticated", async () => {
      vi.mocked(requireAdminApi).mockResolvedValueOnce({
        ok: false,
        response: NextResponse.json(
          { success: false, message: "Authentication is required." },
          { status: 401 },
        ),
      });
  
      const response = await callPatch({ status: "confirmed" });
  
      expect(response.status).toBe(401);
      expect(mockConnect).not.toHaveBeenCalled();
    });
  
    it("rejects an invalid order UUID", async () => {
      const response = await callPatch(
        { status: "confirmed" },
        "invalid-id",
      );
  
      expect(response.status).toBe(400);
      expect(mockConnect).not.toHaveBeenCalled();
    });
  
    it("rejects an unknown status", async () => {
      const response = await callPatch({ status: "unknown" });
  
      expect(response.status).toBe(400);
      expect(mockConnect).not.toHaveBeenCalled();
    });
  
    it("updates a pending order to confirmed", async () => {
      const response = await callPatch({ status: "confirmed" });
      const body = await responseBody(response);
  
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual({
        id: ORDER_ID,
        status: "confirmed",
      });
  
      expect(storedOrderStatus).toBe("confirmed");
  
      expect(mockQuery).toHaveBeenCalledWith("COMMIT");
      expect(mockQuery).not.toHaveBeenCalledWith(
        expect.stringContaining("WITH stock_requirements AS"),
        expect.anything(),
      );
    });
  
    it("rejects an illegal transition and rolls back", async () => {
      const response = await callPatch({ status: "shipped" });
      const body = await responseBody(response);
  
      expect(response.status).toBe(409);
      expect(body.success).toBe(false);
      expect(storedOrderStatus).toBe("pending");
  
      expect(mockQuery).toHaveBeenCalledWith("ROLLBACK");
      expect(mockQuery).not.toHaveBeenCalledWith(
        expect.stringContaining("WITH stock_requirements AS"),
        expect.anything(),
      );
    });
  
    it("returns 404 when the order does not exist", async () => {
      orderExists = false;
  
      const response = await callPatch({ status: "confirmed" });
  
      expect(response.status).toBe(404);
      expect(mockQuery).toHaveBeenCalledWith("ROLLBACK");
      expect(mockQuery).not.toHaveBeenCalledWith(
        expect.stringContaining("UPDATE public.orders SET status = $2"),
        expect.anything(),
      );
    });
  
    it("restores stock in the transaction when cancelling an order", async () => {
      const response = await callPatch({ status: "cancelled" });
      const body = await responseBody(response);
  
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data?.status).toBe("cancelled");
  
      expect(
        mockQuery.mock.calls.filter(([query]) =>
          String(query).includes("WITH stock_requirements AS"),
        ),
      ).toHaveLength(1);
  
      const sqlCalls = mockQuery.mock.calls.map(([query]) =>
        normaliseSql(String(query)),
      );
  
      const stockIndex = sqlCalls.findIndex((sql) =>
        sql.startsWith("WITH stock_requirements AS"),
      );
      const updateIndex = sqlCalls.findIndex((sql) =>
        sql.startsWith("UPDATE public.orders SET status = $2"),
      );
      const commitIndex = sqlCalls.indexOf("COMMIT");
  
      expect(stockIndex).toBeGreaterThan(-1);
      expect(updateIndex).toBeGreaterThan(stockIndex);
      expect(commitIndex).toBeGreaterThan(updateIndex);
    });
  
    it("does not restore stock a second time for an already cancelled order", async () => {
      storedOrderStatus = "cancelled";
  
      const response = await callPatch({ status: "cancelled" });
      const body = await responseBody(response);
  
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
  
      expect(
        mockQuery.mock.calls.filter(([query]) =>
          String(query).includes("WITH stock_requirements AS"),
        ),
      ).toHaveLength(0);
  
      expect(
        mockQuery.mock.calls.some(([query]) =>
          normaliseSql(String(query)).startsWith(
            "UPDATE public.orders SET status = $2",
          ),
        ),
      ).toBe(false);
    });
  
    it("rolls back the cancellation if stock restoration fails", async () => {
      failStockRestoration = true;
  
      vi.spyOn(console, "error").mockImplementation(() => {});
  
      const response = await callPatch({ status: "cancelled" });
      const body = await responseBody(response);
  
      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
  
      expect(mockQuery).toHaveBeenCalledWith("ROLLBACK");
  
      expect(
        mockQuery.mock.calls.some(([query]) =>
          normaliseSql(String(query)).startsWith(
            "UPDATE public.orders SET status = $2",
          ),
        ),
      ).toBe(false);
    });
  });