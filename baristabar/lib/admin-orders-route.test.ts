import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
  } from "vitest";
  import { NextResponse } from "next/server";

  import { getPool } from "@/lib/db";
  import { requireAdminApi } from "@/lib/require-admin-api";
  import { GET } from "@/app/api/admin/orders/route";

  vi.mock("@/lib/db", () => ({
    getPool: vi.fn(),
  }));

  vi.mock("@/lib/require-admin-api", () => ({
    requireAdminApi: vi.fn(),
  }));

  const ADMIN_ID = "660e8400-e29b-41d4-a716-446655440000";

  const ORDER_ID = "550e8400-e29b-41d4-a716-446655440000";

  const mockQuery = vi.fn();

  const SAMPLE_ORDER = {
    id: ORDER_ID,
    createdAt: "2026-11-15T10:00:00.000Z",
    customerEmail: "customer@example.com",
    customerName: "Test Customer",
    customerPhone: "+21620000000",
    shippingAddress: "Test address",
    shippingGovernorate: "Tunis",
    shippingCity: "Tunis",
    shippingPostalCode: "1000",
    shippingNotes: null,
    paymentMethod: "cash_on_delivery",
    paymentStatus: "unpaid",
    status: "pending",
    currency: "TND",
    subtotal: "100.000",
    deliveryFee: "7.000",
    total: "107.000",
    items: [],
  };

  const GLOBAL_STATISTICS = {
    total: 250,
    pending: 40,
    confirmed: 30,
    processing: 50,
    shipped: 45,
    delivered: 70,
    cancelled: 15,
    revenue: "12500.000",
  };

  function normalizeSql(query: string): string {
    return query.replace(/\s+/g, " ").trim();
  }

  function createRequest(query = ""): Request {
    return new Request(
      `http://localhost:3000/api/admin/orders${query}`,
      {
        method: "GET",
      },
    );
  }

  function authorizeAdmin() {
    vi.mocked(requireAdminApi).mockResolvedValue({
      ok: true,
      userId: ADMIN_ID,
    });
  }

  function configureSuccessfulQueries(options?: {
    filteredTotal?: number;
    orderRows?: typeof SAMPLE_ORDER[];
    statistics?: typeof GLOBAL_STATISTICS;
  }) {
    const {
      filteredTotal = 61,
      orderRows = [SAMPLE_ORDER],
      statistics = GLOBAL_STATISTICS,
    } = options ?? {};

    mockQuery.mockImplementation(async (query: string) => {
      const sql = normalizeSql(query);

      // Count matching orders.
      if (
        sql.startsWith(
          "SELECT COUNT(*)::int AS total FROM public.orders o WHERE",
        )
      ) {
        return {
          rows: [{ total: filteredTotal }],
        };
      }

      // Global statistics, independent of active filters.
      if (
        sql.startsWith("SELECT COUNT(*)::int AS total,")
      ) {
        return {
          rows: [statistics],
        };
      }

      // Paginated order data.
      if (sql.startsWith("WITH page_orders AS")) {
        return {
          rows: orderRows,
        };
      }

      throw new Error(`Unexpected SQL query: ${sql}`);
    });
  }

  describe("GET /api/admin/orders", () => {
    beforeEach(() => {
      vi.clearAllMocks();

      mockQuery.mockReset();

      vi.mocked(getPool).mockReset();
      vi.mocked(getPool).mockReturnValue({
        query: mockQuery,
      } as never);

      vi.mocked(requireAdminApi).mockReset();
      authorizeAdmin();
    });

    it("refuses access when the administrator is not authenticated", async () => {
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

      const response = await GET(createRequest());

      expect(response.status).toBe(401);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it("refuses access when the user is not an administrator", async () => {
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

      const response = await GET(createRequest());

      expect(response.status).toBe(403);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it("rejects an invalid page number", async () => {
      const response = await GET(createRequest("?page=0"));

      expect(response.status).toBe(400);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it("rejects a page size greater than 100", async () => {
      const response = await GET(createRequest("?limit=101"));

      expect(response.status).toBe(400);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it("rejects an unknown order status", async () => {
      const response = await GET(
        createRequest("?status=unknown"),
      );

      expect(response.status).toBe(400);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it("rejects an unknown date filter", async () => {
      const response = await GET(
        createRequest("?date=yesterday"),
      );

      expect(response.status).toBe(400);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it("rejects search text longer than 120 characters", async () => {
      const search = "a".repeat(121);

      const response = await GET(
        createRequest(`?search=${search}`),
      );

      expect(response.status).toBe(400);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it("returns filtered and paginated orders with global statistics", async () => {
      configureSuccessfulQueries({
        filteredTotal: 61,
      });

      const response = await GET(
        createRequest(
          "?page=2&limit=25&search=coffee&status=processing&date=7days",
        ),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("no-store");

      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(ORDER_ID);

      expect(body.pagination).toEqual({
        page: 2,
        limit: 25,
        total: 61,
        totalPages: 3,
        hasPreviousPage: true,
        hasNextPage: true,
      });

      // Statistics represent all orders, not only the filtered results.
      expect(body.statistics).toEqual(GLOBAL_STATISTICS);

      const calls = mockQuery.mock.calls;

      const countCall = calls.find(([query]) =>
        normalizeSql(String(query)).startsWith(
          "SELECT COUNT(*)::int AS total FROM public.orders o",
        ),
      );

      const statisticsCall = calls.find(([query]) =>
        normalizeSql(String(query)).startsWith(
          "SELECT COUNT(*)::int AS total,",
        ),
      );

      const ordersCall = calls.find(([query]) =>
        normalizeSql(String(query)).startsWith(
          "WITH page_orders AS",
        ),
      );

      expect(countCall?.[1]).toEqual([
        "coffee",
        "processing",
        "7days",
      ]);

      expect(ordersCall?.[1]).toEqual([
        "coffee",
        "processing",
        "7days",
        25,
        25,
      ]);

      expect(statisticsCall).toBeDefined();

      const ordersSql = normalizeSql(String(ordersCall?.[0]));

      expect(ordersSql).toContain("FROM public.order_items oi");
      expect(ordersSql).toContain(
        "ORDER BY o.created_at DESC, o.id DESC",
      );
      expect(ordersSql).toContain("OFFSET $5::int");
    });

    it("clamps the requested page when filters reduce the result count", async () => {
      configureSuccessfulQueries({
        filteredTotal: 30,
        orderRows: [],
      });

      const response = await GET(
        createRequest("?page=9&limit=25"),
      );

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body.pagination).toEqual({
        page: 2,
        limit: 25,
        total: 30,
        totalPages: 2,
        hasPreviousPage: true,
        hasNextPage: false,
      });

      const ordersCall = mockQuery.mock.calls.find(([query]) =>
        normalizeSql(String(query)).startsWith(
          "WITH page_orders AS",
        ),
      );

      expect(ordersCall?.[1]).toEqual([
        "",
        null,
        "all",
        25,
        25,
      ]);
    });

    it("returns an empty result with a valid first page", async () => {
      configureSuccessfulQueries({
        filteredTotal: 0,
        orderRows: [],
      });

      const response = await GET(
        createRequest("?search=no-result"),
      );

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);

      expect(body.pagination).toEqual({
        page: 1,
        limit: 25,
        total: 0,
        totalPages: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      });

      expect(body.statistics).toEqual(GLOBAL_STATISTICS);
    });

    it("returns 500 when the database query fails", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});

      mockQuery.mockRejectedValue(
        new Error("Simulated database failure"),
      );

      const response = await GET(createRequest());

      expect(response.status).toBe(500);

      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.message).toBe("Unable to retrieve orders.");
    });
  });
