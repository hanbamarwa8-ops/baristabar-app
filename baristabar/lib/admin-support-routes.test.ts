import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

import { getPool } from "@/lib/db";
import { requireAdminApi } from "@/lib/require-admin-api";
import { GET as listConversations } from "@/app/api/admin/support/conversations/route";
import {
  GET as getConversation,
  PATCH as updateConversationStatus,
  POST as sendAdminReply,
} from "@/app/api/admin/support/conversations/[id]/route";

vi.mock("@/lib/db", () => ({ getPool: vi.fn() }));
vi.mock("@/lib/require-admin-api", () => ({ requireAdminApi: vi.fn() }));

const ADMIN_ID = "660e8400-e29b-41d4-a716-446655440000";
const CUSTOMER_ID = "550e8400-e29b-41d4-a716-446655440000";
const ORDER_ID = "770e8400-e29b-41d4-a716-446655440000";
const CONVERSATION_ID = "880e8400-e29b-41d4-a716-446655440000";
const MESSAGE_ID = "990e8400-e29b-41d4-a716-446655440000";

const CONVERSATION = {
  id: CONVERSATION_ID,
  customer_id: CUSTOMER_ID,
  customer_name: "Maram Hanba",
  customer_email: "maram@example.com",
  customer_phone: "33333333",
  customer_status: "active" as const,
  status: "open" as const,
  created_at: "2026-11-16T10:00:00.000Z",
  updated_at: "2026-11-16T10:05:00.000Z",
  last_message_at: "2026-11-16T10:05:00.000Z",
};

const MESSAGE = {
  id: MESSAGE_ID,
  conversation_id: CONVERSATION_ID,
  sender_id: CUSTOMER_ID,
  sender_role: "customer" as const,
  body: "I need help with my order.",
  order_id: ORDER_ID,
  read_at: "2026-11-16T10:06:00.000Z",
  created_at: "2026-11-16T10:05:00.000Z",
};

type MockConversation = Omit<typeof CONVERSATION, "status"> & {
  status: "open" | "closed";
};
type MockMessage = Omit<typeof MESSAGE, "sender_role" | "read_at"> & {
  sender_role: "customer" | "admin";
  read_at: string | null;
};

const mockQuery = vi.fn();
const mockClientQuery = vi.fn();
const mockConnect = vi.fn();
const mockRelease = vi.fn();

function normalizeSql(query: string): string {
  return query.replace(/\s+/g, " ").trim();
}

function createListRequest(query = ""): Request {
  return new Request(`http://localhost:3000/api/admin/support/conversations${query}`);
}

function createDetailRequest(
  method: "GET" | "POST" | "PATCH",
  body?: unknown,
): Request {
  return new Request(
    `http://localhost:3000/api/admin/support/conversations/${CONVERSATION_ID}`,
    {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    },
  );
}

const routeContext = { params: Promise.resolve({ id: CONVERSATION_ID }) };

function authorizeAdmin() {
  vi.mocked(requireAdminApi).mockResolvedValue({ ok: true, userId: ADMIN_ID });
}

function configureListQueries(options?: {
  total?: number;
  conversations?: Array<Record<string, unknown>>;
  statistics?: { total: number; open: number; closed: number; unread: number };
}) {
  const {
    total = 1,
    conversations = [{
      id: CONVERSATION_ID,
      customerId: CUSTOMER_ID,
      customerName: "Maram Hanba",
      customerEmail: "maram@example.com",
      customerPhone: "33333333",
      customerStatus: "active",
      status: "open",
      createdAt: CONVERSATION.created_at,
      updatedAt: CONVERSATION.updated_at,
      lastMessageAt: CONVERSATION.last_message_at,
      lastMessage: "I need help with my order.",
      lastSenderRole: "customer",
      unreadCount: 1,
    }],
    statistics = { total: 8, open: 5, closed: 3, unread: 4 },
  } = options ?? {};

  mockQuery.mockImplementation(async (query: string) => {
    const sql = normalizeSql(query);
    if (sql.includes("SELECT COUNT(*)::int AS total FROM conversation_rows")) {
      return { rows: [{ total }] };
    }
    if (sql.includes("COUNT(*) FILTER (WHERE status = 'open')")) {
      return { rows: [statistics] };
    }
    if (sql.includes("SELECT * FROM conversation_rows")) {
      return { rows: conversations };
    }
    throw new Error(`Unexpected SQL query: ${sql}`);
  });
}

function configureConversationTransaction(options?: {
  conversation?: MockConversation | null;
  messages?: MockMessage[];
  insertedMessage?: MockMessage;
  orderExists?: boolean;
}) {
  const {
    conversation = CONVERSATION,
    messages = [MESSAGE],
    insertedMessage = {
      ...MESSAGE,
      id: MESSAGE_ID,
      sender_id: ADMIN_ID,
      sender_role: "admin",
      body: "We are checking this for you.",
      read_at: null,
    },
    orderExists = true,
  } = options ?? {};

  mockClientQuery.mockImplementation(async (query: string) => {
    const sql = normalizeSql(query);
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql)) return { rows: [] };
    if (sql.startsWith("SELECT c.id::text")) {
      return { rows: conversation ? [conversation] : [] };
    }
    if (sql.startsWith("SELECT id::text FROM public.orders")) {
      return { rows: orderExists ? [{ id: ORDER_ID }] : [] };
    }
    if (sql.startsWith("SELECT id::text, conversation_id::text")) {
      return { rows: messages };
    }
    if (sql.startsWith("INSERT INTO public.support_messages")) {
      return { rows: [insertedMessage] };
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

describe("GET /api/admin/support/conversations", () => {
  it("requires administrator access before querying the database", async () => {
    vi.mocked(requireAdminApi).mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ success: false }, { status: 401 }),
    });

    const response = await listConversations(createListRequest());
    expect(response.status).toBe(401);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("rejects invalid pagination, status and overlong search", async () => {
    expect((await listConversations(createListRequest("?page=0"))).status).toBe(400);
    expect((await listConversations(createListRequest("?limit=101"))).status).toBe(400);
    expect((await listConversations(createListRequest("?status=archived"))).status).toBe(400);
    expect((await listConversations(createListRequest(`?search=${"x".repeat(121)}`))).status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns filtered and paginated inbox rows with global unread statistics", async () => {
    configureListQueries({ total: 21 });

    const response = await listConversations(
      createListRequest("?page=2&limit=20&status=open&search=maram"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.data[0].customerName).toBe("Maram Hanba");
    expect(body.data[0].unreadCount).toBe(1);
    expect(body.pagination).toEqual({
      page: 2,
      limit: 20,
      total: 21,
      totalPages: 2,
      hasPreviousPage: true,
      hasNextPage: false,
    });
    expect(body.statistics).toEqual({ total: 8, open: 5, closed: 3, unread: 4 });

    const rowsCall = mockQuery.mock.calls.find((call) =>
      normalizeSql(String(call[0])).includes("SELECT * FROM conversation_rows"),
    );
    expect(rowsCall?.[1]).toEqual(["open", "maram", 20, 20]);
    expect(normalizeSql(String(rowsCall?.[0]))).toContain("m.sender_role = 'customer'");
  });

  it("fails safely when an inbox query fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockQuery.mockRejectedValueOnce(new Error("Simulated database failure"));

    const response = await listConversations(createListRequest());

    expect(response.status).toBe(500);
    expect((await response.json()).message).toBe("Unable to retrieve support conversations.");
  });
});

describe("GET /api/admin/support/conversations/[id]", () => {
  it("requires administrator access for thread actions", async () => {
    vi.mocked(requireAdminApi).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ success: false }, { status: 401 }),
    });

    const getResponse = await getConversation(createDetailRequest("GET"), routeContext);
    const postResponse = await sendAdminReply(
      createDetailRequest("POST", { message: "Hello" }),
      routeContext,
    );
    const patchResponse = await updateConversationStatus(
      createDetailRequest("PATCH", { status: "closed" }),
      routeContext,
    );

    expect(getResponse.status).toBe(401);
    expect(postResponse.status).toBe(401);
    expect(patchResponse.status).toBe(401);
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("rejects an invalid conversation UUID", async () => {
    const response = await getConversation(
      new Request("http://localhost:3000/api/admin/support/conversations/not-a-uuid"),
      { params: Promise.resolve({ id: "not-a-uuid" }) },
    );

    expect(response.status).toBe(400);
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("returns the conversation and marks customer messages as read", async () => {
    configureConversationTransaction();

    const response = await getConversation(createDetailRequest("GET"), routeContext);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.conversation.customerName).toBe("Maram Hanba");
    expect(body.data.messages[0]).toMatchObject({
      senderRole: "customer",
      message: "I need help with my order.",
      orderId: ORDER_ID,
    });
    expect(mockClientQuery).toHaveBeenCalledWith(
      expect.stringContaining("sender_role = 'customer'"),
      [CONVERSATION_ID],
    );
    expect(mockClientQuery).toHaveBeenCalledWith("COMMIT");
    expect(mockRelease).toHaveBeenCalledOnce();
  });

  it("returns 404 and rolls back when the conversation does not exist", async () => {
    configureConversationTransaction({ conversation: null });

    const response = await getConversation(createDetailRequest("GET"), routeContext);

    expect(response.status).toBe(404);
    expect(mockClientQuery).toHaveBeenCalledWith("ROLLBACK");
    expect(mockRelease).toHaveBeenCalledOnce();
  });
});

describe("POST /api/admin/support/conversations/[id]", () => {
  it("rejects empty and overlong replies", async () => {
    expect((await sendAdminReply(createDetailRequest("POST", { message: " " }), routeContext)).status).toBe(400);
    expect((await sendAdminReply(createDetailRequest("POST", { message: "x".repeat(4001) }), routeContext)).status).toBe(400);
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("rejects an order that does not belong to the conversation customer", async () => {
    configureConversationTransaction({ orderExists: false });

    const response = await sendAdminReply(
      createDetailRequest("POST", { message: "We are checking your order.", orderId: ORDER_ID }),
      routeContext,
    );

    expect(response.status).toBe(404);
    expect(mockClientQuery).toHaveBeenCalledWith("ROLLBACK");
    expect(mockClientQuery.mock.calls.some((call) =>
      normalizeSql(String(call[0])).startsWith("INSERT INTO public.support_messages"),
    )).toBe(false);
  });

  it("sends the Admin reply and reopens a closed conversation", async () => {
    const closedConversation = { ...CONVERSATION, status: "closed" as const };
    const insertedMessage = {
      ...MESSAGE,
      sender_id: ADMIN_ID,
      sender_role: "admin" as const,
      body: "We are checking this for you.",
      read_at: null,
    };
    configureConversationTransaction({
      conversation: closedConversation,
      insertedMessage,
    });

    const response = await sendAdminReply(
      createDetailRequest("POST", { message: "  We are checking this for you.  " }),
      routeContext,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.status).toBe("open");
    expect(body.data.message).toMatchObject({
      senderId: ADMIN_ID,
      senderRole: "admin",
      message: "We are checking this for you.",
    });
    const insertCall = mockClientQuery.mock.calls.find((call) =>
      normalizeSql(String(call[0])).startsWith("INSERT INTO public.support_messages"),
    );
    expect(insertCall?.[1]).toEqual([
      CONVERSATION_ID,
      ADMIN_ID,
      "We are checking this for you.",
      null,
    ]);
    expect(mockClientQuery).toHaveBeenCalledWith("COMMIT");
  });
});

describe("PATCH /api/admin/support/conversations/[id]", () => {
  it("rejects unsupported status values", async () => {
    const response = await updateConversationStatus(
      createDetailRequest("PATCH", { status: "archived" }),
      routeContext,
    );

    expect(response.status).toBe(400);
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("closes a conversation in a transaction", async () => {
    configureConversationTransaction();

    const response = await updateConversationStatus(
      createDetailRequest("PATCH", { status: "closed" }),
      routeContext,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ id: CONVERSATION_ID, status: "closed" });
    expect(mockClientQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE public.support_conversations"),
      [CONVERSATION_ID, "closed"],
    );
    expect(mockClientQuery).toHaveBeenCalledWith("COMMIT");
  });

  it("is idempotent when the conversation already has the requested status", async () => {
    configureConversationTransaction();

    const response = await updateConversationStatus(
      createDetailRequest("PATCH", { status: "open" }),
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(mockClientQuery).toHaveBeenCalledWith("COMMIT");
    expect(mockClientQuery.mock.calls.some((call) =>
      normalizeSql(String(call[0])).startsWith("UPDATE public.support_conversations"),
    )).toBe(false);
  });
});
