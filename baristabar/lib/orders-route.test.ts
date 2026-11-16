import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
  } from "vitest";
  
  import { getPool } from "@/lib/db";
  import { createClient } from "@/lib/supabase/server";
  import { POST } from "@/app/api/orders/route";
  
  const {
    mockGetUser,
    mockConnect,
    mockQuery,
    mockRelease,
  } = vi.hoisted(() => ({
    mockGetUser: vi.fn(),
    mockConnect: vi.fn(),
    mockQuery: vi.fn(),
    mockRelease: vi.fn(),
  }));
  
  vi.mock("@/lib/db", () => ({
    getPool: vi.fn(() => ({
      connect: mockConnect,
    })),
  }));
  
  vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(async () => ({
      auth: {
        getUser: mockGetUser,
      },
    })),
  }));
  
  vi.mock("@/lib/tunisia-locations", () => ({
    TUNISIAN_LOCATIONS: {
      Tunis: ["Tunis"],
    },
  }));
  
  const CUSTOMER_ID = "660e8400-e29b-41d4-a716-446655440000";
  const ADMIN_ID = "660e8400-e29b-41d4-a716-446655440001";
  const PRODUCT_ID = "550e8400-e29b-41d4-a716-446655440000";
  const ORDER_ID = "770e8400-e29b-41d4-a716-446655440000";
  const IDEMPOTENCY_KEY = "880e8400-e29b-41d4-a716-446655440000";
  
  const PRODUCT_ROW = {
    id: PRODUCT_ID,
    name: "Ethiopia Yirgacheffe",
    slug: "ethiopia-yirgacheffe",
    category: "Coffee Beans",
    price: "12.500",
    stock: 10,
  };
  
  const ORDER_ROW = {
    id: ORDER_ID,
    status: "pending",
    subtotal: "12.500",
    delivery_fee: "7.000",
    total: "19.500",
    created_at: "2026-11-15T10:00:00.000Z",
  };
  
  function normalizeSql(query: string): string {
    return query.replace(/\s+/g, " ").trim();
  }
  
  function makeRequest(overrides: Record<string, unknown> = {}): Request {
    const payload = {
      idempotencyKey: IDEMPOTENCY_KEY,
      customerName: "Test Customer",
      customerPhone: "20123456",
      shippingAddress: "10 Test Street",
      shippingGovernorate: "Tunis",
      shippingCity: "Tunis",
      shippingCityIsCustom: false,
      shippingPostalCode: "1000",
      shippingNotes: null,
      items: [
        {
          type: "product",
          productId: PRODUCT_ID,
          quantity: 1,
        },
      ],
      ...overrides,
    };
  
    return new Request("http://localhost:3000/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }
  
  function configureAuthenticatedUser(userId = CUSTOMER_ID) {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: userId,
          email: userId === ADMIN_ID ? "admin@example.com" : "customer@example.com",
        },
      },
      error: null,
    });
  }
  
  function configureDatabase(options?: {
    profile?: { role: string; account_status: string } | null;
    existingOrder?: typeof ORDER_ROW | null;
  }) {
    const {
      profile = { role: "customer", account_status: "active" },
      existingOrder = null,
    } = options ?? {};
  
    mockQuery.mockImplementation(async (query: string) => {
      const sql = normalizeSql(query);
  
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
        return { rows: [], rowCount: null };
      }
  
      if (sql.startsWith("SELECT role, account_status FROM public.profiles")) {
        return {
          rows: profile ? [profile] : [],
          rowCount: profile ? 1 : 0,
        };
      }
  
      if (sql.startsWith("SELECT id, status, subtotal::text")) {
        return {
          rows: existingOrder ? [existingOrder] : [],
          rowCount: existingOrder ? 1 : 0,
        };
      }
  
      if (sql.startsWith("SELECT id::text, name, slug, category, price::text, stock")) {
        return {
          rows: [PRODUCT_ROW],
          rowCount: 1,
        };
      }
  
      if (sql.startsWith("INSERT INTO public.orders")) {
        return {
          rows: [ORDER_ROW],
          rowCount: 1,
        };
      }
  
      if (sql.startsWith("INSERT INTO public.order_items")) {
        return {
          rows: [],
          rowCount: 1,
        };
      }
  
      if (sql.startsWith("UPDATE public.products")) {
        return {
          rows: [],
          rowCount: 1,
        };
      }
  
      throw new Error(`Unexpected SQL query: ${sql}`);
    });
  }
  
  async function responseBody(response: Response) {
    return response.json() as Promise<{
      success?: boolean;
      message?: string;
      order?: {
        id: string;
        replayed?: boolean;
      };
    }>;
  }
  
  describe("POST /api/orders - customer account status", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockQuery.mockReset();
      mockRelease.mockReset();
      mockConnect.mockReset();
      mockGetUser.mockReset();
  
      process.env.ORDERS_DRY_RUN_ENABLED = "false";
      process.env.DELIVERY_FEE_TND = "7.000";
  
      configureAuthenticatedUser();
      configureDatabase();
  
      mockConnect.mockResolvedValue({
        query: mockQuery,
        release: mockRelease,
      });
  
      vi.mocked(getPool).mockReturnValue({
        connect: mockConnect,
      } as never);
  
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: mockGetUser },
      } as never);
    });
  
    it("returns 401 and does not connect to the database when the user is unauthenticated", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error("Unauthenticated"),
      });
  
      const response = await POST(makeRequest());
      const body = await responseBody(response);
  
      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(mockConnect).not.toHaveBeenCalled();
    });
  
    it("rejects a customer whose profile is suspended before checking idempotency or products", async () => {
      configureDatabase({
        profile: { role: "customer", account_status: "suspended" },
      });
  
      const response = await POST(makeRequest());
      const body = await responseBody(response);
  
      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.message).toMatch(/suspended/i);
  
      const sqlCalls = mockQuery.mock.calls.map(([query]) => normalizeSql(String(query)));
      expect(sqlCalls[0]).toBe("BEGIN");
      expect(sqlCalls[1]).toContain("FOR SHARE");
      expect(sqlCalls).toContain("ROLLBACK");
      expect(sqlCalls.some((sql) => sql.startsWith("SELECT id, status, subtotal::text"))).toBe(false);
      expect(sqlCalls.some((sql) => sql.startsWith("SELECT id::text, name, slug"))).toBe(false);
      expect(sqlCalls.some((sql) => sql.startsWith("INSERT INTO public.orders"))).toBe(false);
      expect(mockRelease).toHaveBeenCalledOnce();
    });
  
    it("fails closed when the authenticated user has no profile", async () => {
      configureDatabase({ profile: null });
  
      const response = await POST(makeRequest());
      const body = await responseBody(response);
  
      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.message).toMatch(/profile could not be verified/i);
  
      const sqlCalls = mockQuery.mock.calls.map(([query]) => normalizeSql(String(query)));
      expect(sqlCalls).toContain("ROLLBACK");
      expect(sqlCalls.some((sql) => sql.startsWith("INSERT INTO public.orders"))).toBe(false);
    });
  
    it("allows an active customer to place an order and checks the profile before idempotency", async () => {
      const response = await POST(makeRequest());
      const body = await responseBody(response);
  
      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.order?.id).toBe(ORDER_ID);
  
      const sqlCalls = mockQuery.mock.calls.map(([query]) => normalizeSql(String(query)));
      const profileIndex = sqlCalls.findIndex((sql) => sql.startsWith("SELECT role, account_status"));
      const idempotencyIndex = sqlCalls.findIndex((sql) => sql.startsWith("SELECT id, status, subtotal::text"));
      const insertIndex = sqlCalls.findIndex((sql) => sql.startsWith("INSERT INTO public.orders"));
  
      expect(profileIndex).toBeGreaterThan(-1);
      expect(idempotencyIndex).toBeGreaterThan(profileIndex);
      expect(insertIndex).toBeGreaterThan(idempotencyIndex);
      expect(sqlCalls).toContain("COMMIT");
      expect(mockRelease).toHaveBeenCalledOnce();
    });
  
    it("allows an active customer's idempotent replay after checking account status", async () => {
      configureDatabase({ existingOrder: ORDER_ROW });
  
      const response = await POST(makeRequest());
      const body = await responseBody(response);
  
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.order?.id).toBe(ORDER_ID);
      expect(body.order?.replayed).toBe(true);
  
      const sqlCalls = mockQuery.mock.calls.map(([query]) => normalizeSql(String(query)));
      const profileIndex = sqlCalls.findIndex((sql) => sql.startsWith("SELECT role, account_status"));
      const idempotencyIndex = sqlCalls.findIndex((sql) => sql.startsWith("SELECT id, status, subtotal::text"));
  
      expect(profileIndex).toBeGreaterThan(-1);
      expect(idempotencyIndex).toBeGreaterThan(profileIndex);
      expect(sqlCalls.some((sql) => sql.startsWith("SELECT id::text, name, slug"))).toBe(false);
      expect(sqlCalls).toContain("COMMIT");
    });
  
    it("does not return an existing order to a suspended customer during idempotent replay", async () => {
      configureDatabase({
        profile: { role: "customer", account_status: "suspended" },
        existingOrder: ORDER_ROW,
      });
  
      const response = await POST(makeRequest());
      const body = await responseBody(response);
  
      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.message).toMatch(/suspended/i);
  
      const sqlCalls = mockQuery.mock.calls.map(([query]) => normalizeSql(String(query)));
      expect(sqlCalls.some((sql) => sql.startsWith("SELECT id, status, subtotal::text"))).toBe(false);
      expect(sqlCalls).toContain("ROLLBACK");
    });
  
    it("preserves the existing checkout behavior for an administrator", async () => {
      configureAuthenticatedUser(ADMIN_ID);
      configureDatabase({
        profile: { role: "admin", account_status: "suspended" },
      });
  
      const response = await POST(makeRequest());
      const body = await responseBody(response);
  
      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.order?.id).toBe(ORDER_ID);
    });
  
    it("rejects a profile with an unexpected role", async () => {
      configureDatabase({
        profile: { role: "unknown", account_status: "active" },
      });
  
      const response = await POST(makeRequest());
      const body = await responseBody(response);
  
      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.message).toMatch(/not allowed/i);
      expect(mockQuery).toHaveBeenCalledWith("ROLLBACK");
    });
  });
  