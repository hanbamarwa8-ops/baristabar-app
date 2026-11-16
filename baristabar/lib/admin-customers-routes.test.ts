import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

import { getPool } from "@/lib/db";
import { requireAdminApi } from "@/lib/require-admin-api";
import { GET } from "@/app/api/admin/customers/route";
import { PATCH } from "@/app/api/admin/customers/[id]/route";

vi.mock("@/lib/db", () => ({ getPool: vi.fn() }));
vi.mock("@/lib/require-admin-api", () => ({ requireAdminApi: vi.fn() }));

const ADMIN_ID = "660e8400-e29b-41d4-a716-446655440000";
const CUSTOMER_ID = "550e8400-e29b-41d4-a716-446655440000";

const CUSTOMER = {
  id: CUSTOMER_ID,
  name: "Maram Hanba",
  email: "maram@example.com",
  phone: null,
  accountStatus: "active" as const,
  createdAt: "2026-11-10T10:00:00.000Z",
  orderCount: 2,
  totalSpent: "85.000",
  lastOrderAt: "2026-11-15T10:00:00.000Z",
};

const STATISTICS = {
  total_customers: 12,
  active_customers: 10,
  suspended_customers: 2,
  total_paid: "1250.000",
};

const mockQuery = vi.fn();
const mockClientQuery = vi.fn();
const mockConnect = vi.fn();
const mockRelease = vi.fn();

function normalizeSql(query: string): string {
  return query.replace(/\s+/g, " ").trim();
}

function createGetRequest(query = ""): Request {
  return new Request(`http://localhost:3000/api/admin/customers${query}`);
}

function createPatchRequest(body: unknown): Request {
  return new Request(`http://localhost:3000/api/admin/customers/${CUSTOMER_ID}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function authorizeAdmin() {
  vi.mocked(requireAdminApi).mockResolvedValue({ ok: true, userId: ADMIN_ID });
}

function configureListQueries(options?: {
  total?: number;
  customers?: typeof CUSTOMER[];
  statistics?: typeof STATISTICS;
}) {
  const {
    total = 12,
    customers = [CUSTOMER],
    statistics = STATISTICS,
  } = options ?? {};

  mockQuery.mockImplementation(async (query: string) => {
    const sql = normalizeSql(query);
    if (sql.includes("SELECT COUNT(*)::int AS total FROM customer_rows")) {
      return { rows: [{ total }] };
    }
    if (sql.includes("AS total_customers") && sql.includes("FROM customer_rows")) {
      return { rows: [statistics] };
    }
    if (sql.includes("SELECT * FROM customer_rows")) {
      return { rows: customers };
    }
    throw new Error(`Unexpected SQL query: ${sql}`);
  });
}

function configureCustomerTransaction(options?: {
  customer?: { id: string; role: string; account_status: "active" | "suspended" } | null;
  updated?: {
    id: string;
    account_status: "active" | "suspended";
    suspended_at: string | null;
    suspended_by: string | null;
    suspension_reason: string | null;
    updated_at: string;
  };
}) {
  const customer = options?.customer === undefined
    ? { id: CUSTOMER_ID, role: "customer", account_status: "active" as const }
    : options.customer;
  const updated = options?.updated ?? {
    id: CUSTOMER_ID,
    account_status: "suspended" as const,
    suspended_at: "2026-11-16T10:00:00.000Z",
    suspended_by: ADMIN_ID,
    suspension_reason: "Policy violation",
    updated_at: "2026-11-16T10:00:00.000Z",
  };

  mockClientQuery.mockImplementation(async (query: string) => {
    const sql = normalizeSql(query);
    if (sql.startsWith("SELECT id::text, role, account_status")) {
      return { rows: customer ? [customer] : [] };
    }
    if (sql.startsWith("UPDATE public.profiles")) {
      return { rows: [updated] };
    }
    return { rows: [] };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockClientQuery.mockReset();
  mockConnect.mockReset();
  mockRelease.mockReset();

  vi.mocked(getPool).mockReturnValue({
    query: mockQuery,
    connect: mockConnect,
  } as never);
  mockConnect.mockResolvedValue({
    query: mockClientQuery,
    release: mockRelease,
  } as never);

  vi.mocked(requireAdminApi).mockReset();
  authorizeAdmin();
});

describe("GET /api/admin/customers", () => {
  it("requires administrator access before querying the database", async () => {
    vi.mocked(requireAdminApi).mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ success: false }, { status: 401 }),
    });

    const response = await GET(createGetRequest());
    expect(response.status).toBe(401);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("rejects invalid pagination and status filters", async () => {
    expect((await GET(createGetRequest("?page=0"))).status).toBe(400);
    expect((await GET(createGetRequest("?limit=101"))).status).toBe(400);
    expect((await GET(createGetRequest("?status=admin"))).status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("rejects search terms longer than 120 characters", async () => {
    const search = "a".repeat(121);
    const response = await GET(createGetRequest(`?search=${search}`));
    expect(response.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns filtered and paginated customers with global statistics", async () => {
    configureListQueries({ total: 31 });

    const response = await GET(
      createGetRequest("?page=2&limit=25&search=maram&status=active"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body.data).toEqual([CUSTOMER]);
    expect(body.pagination).toEqual({
      page: 2,
      limit: 25,
      total: 31,
      totalPages: 2,
      hasPreviousPage: true,
      hasNextPage: false,
    });
    expect(body.statistics).toEqual({
      totalCustomers: 12,
      activeCustomers: 10,
      suspendedCustomers: 2,
      totalPaid: "1250.000",
    });

    const countCall = mockQuery.mock.calls.find(([query]) =>
      normalizeSql(String(query)).includes("SELECT COUNT(*)::int AS total FROM customer_rows"),
    );
    const rowsCall = mockQuery.mock.calls.find(([query]) =>
      normalizeSql(String(query)).includes("SELECT * FROM customer_rows"),
    );
    expect(countCall?.[1]).toEqual(["maram", "active"]);
    expect(rowsCall?.[1]).toEqual(["maram", "active", 25, 25]);
    expect(normalizeSql(String(rowsCall?.[0]))).toContain("WHERE p.role = 'customer'");
  });

  it("excludes unpaid, refunded, and cancelled orders from paid spending", async () => {
    configureListQueries();
    await GET(createGetRequest());
    const sql = mockQuery.mock.calls.map(([query]) => String(query)).join(" ");
    expect(sql).toContain("o.payment_status = 'paid'");
    expect(sql).toContain("o.status <> 'cancelled'");
    expect(sql).toContain("WHERE p.role = 'customer'");
  });

  it("clamps a page that is beyond the filtered result range", async () => {
    configureListQueries({ total: 2, customers: [] });
    const response = await GET(createGetRequest("?page=9&limit=25"));
    const body = await response.json();
    expect(body.pagination).toEqual({
      page: 1,
      limit: 25,
      total: 2,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    });
    expect(mockQuery.mock.calls[2]?.[1]).toEqual(["", "all", 25, 0]);
  });

  it("returns an empty first page when no customers match", async () => {
    configureListQueries({ total: 0, customers: [] });
    const response = await GET(createGetRequest("?search=missing"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.totalPages).toBe(0);
  });

  it("fails safely when a database query fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockQuery.mockRejectedValue(new Error("Simulated database failure"));
    const response = await GET(createGetRequest());
    expect(response.status).toBe(500);
    expect((await response.json()).message).toBe("Unable to retrieve customers.");
  });
});

describe("PATCH /api/admin/customers/[id]", () => {
  it("requires administrator access", async () => {
    vi.mocked(requireAdminApi).mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ success: false }, { status: 403 }),
    });
    const response = await PATCH(createPatchRequest({ accountStatus: "suspended" }), {
      params: Promise.resolve({ id: CUSTOMER_ID }),
    });
    expect(response.status).toBe(403);
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("rejects an invalid customer UUID", async () => {
    const response = await PATCH(createPatchRequest({ accountStatus: "suspended" }), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });
    expect(response.status).toBe(400);
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("rejects an invalid status and overlong reason", async () => {
    const context = { params: Promise.resolve({ id: CUSTOMER_ID }) };
    expect((await PATCH(createPatchRequest({ accountStatus: "admin" }), context)).status).toBe(400);
    expect((await PATCH(createPatchRequest({ accountStatus: "suspended", reason: "x".repeat(501) }), context)).status).toBe(400);
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("suspends a customer in a transaction and records the administrator and reason", async () => {
    configureCustomerTransaction();
    const response = await PATCH(
      createPatchRequest({ accountStatus: "suspended", reason: "  Policy violation  " }),
      { params: Promise.resolve({ id: CUSTOMER_ID }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.accountStatus).toBe("suspended");
    expect(body.data.suspendedBy).toBe(ADMIN_ID);
    expect(body.data.suspensionReason).toBe("Policy violation");

    const calls = mockClientQuery.mock.calls;
    expect(normalizeSql(String(calls[1]?.[0]))).toContain("FOR UPDATE");
    expect(normalizeSql(String(calls[2]?.[0])).startsWith("UPDATE public.profiles")).toBe(true);
    expect(calls[2]?.[1]).toEqual([CUSTOMER_ID, "suspended", ADMIN_ID, "Policy violation"]);
    expect(calls.map(([query]) => normalizeSql(String(query)))).toContain("COMMIT");
    expect(mockRelease).toHaveBeenCalledOnce();
  });

  it("reactivates a customer and clears suspension metadata", async () => {
    configureCustomerTransaction({
      customer: { id: CUSTOMER_ID, role: "customer", account_status: "suspended" },
      updated: {
        id: CUSTOMER_ID,
        account_status: "active",
        suspended_at: null,
        suspended_by: null,
        suspension_reason: null,
        updated_at: "2026-11-16T11:00:00.000Z",
      },
    });

    const response = await PATCH(
      createPatchRequest({ accountStatus: "active" }),
      { params: Promise.resolve({ id: CUSTOMER_ID }) },
    );

    expect(response.status).toBe(200);
    expect((await response.json()).data.accountStatus).toBe("active");
    expect(mockClientQuery.mock.calls[2]?.[1]).toEqual([CUSTOMER_ID, "active", ADMIN_ID, null]);
  });

  it("does not allow an administrator profile to be managed as a customer", async () => {
    configureCustomerTransaction({
      customer: { id: CUSTOMER_ID, role: "admin", account_status: "active" },
    });
    const response = await PATCH(
      createPatchRequest({ accountStatus: "suspended" }),
      { params: Promise.resolve({ id: CUSTOMER_ID }) },
    );
    expect(response.status).toBe(404);
    expect(mockClientQuery.mock.calls.map(([query]) => normalizeSql(String(query)))).toContain("ROLLBACK");
  });

  it("returns 404 for a missing customer", async () => {
    configureCustomerTransaction({ customer: null });
    const response = await PATCH(
      createPatchRequest({ accountStatus: "suspended" }),
      { params: Promise.resolve({ id: CUSTOMER_ID }) },
    );
    expect(response.status).toBe(404);
    expect(mockClientQuery.mock.calls.map(([query]) => normalizeSql(String(query)))).toContain("ROLLBACK");
  });

  it("is idempotent when the account already has the requested status", async () => {
    configureCustomerTransaction();
    const response = await PATCH(
      createPatchRequest({ accountStatus: "active" }),
      { params: Promise.resolve({ id: CUSTOMER_ID }) },
    );
    expect(response.status).toBe(200);
    expect(mockClientQuery).not.toHaveBeenCalledWith(
      expect.stringContaining("UPDATE public.profiles"),
      expect.anything(),
    );
    expect(mockClientQuery.mock.calls.map(([query]) => normalizeSql(String(query)))).toContain("COMMIT");
  });

  it("rolls back and returns 500 when the update query fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockClientQuery.mockImplementation(async (query: string) => {
      const sql = normalizeSql(query);
      if (sql.startsWith("SELECT id::text, role, account_status")) {
        return { rows: [{ id: CUSTOMER_ID, role: "customer", account_status: "active" }] };
      }
      if (sql.startsWith("UPDATE public.profiles")) throw new Error("Simulated update failure");
      return { rows: [] };
    });

    const response = await PATCH(
      createPatchRequest({ accountStatus: "suspended" }),
      { params: Promise.resolve({ id: CUSTOMER_ID }) },
    );
    expect(response.status).toBe(500);
    expect(mockClientQuery.mock.calls.map(([query]) => normalizeSql(String(query)))).toContain("ROLLBACK");
    expect(mockRelease).toHaveBeenCalledOnce();
  });
});
