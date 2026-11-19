import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPool } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import {
  GET,
  POST,
} from "@/app/api/support/conversation/route";

vi.mock("@/lib/db", () => ({ getPool: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const CUSTOMER_ID = "550e8400-e29b-41d4-a716-446655440000";
const ADMIN_ID = "660e8400-e29b-41d4-a716-446655440000";
const ORDER_ID = "770e8400-e29b-41d4-a716-446655440000";
const CONVERSATION_ID = "880e8400-e29b-41d4-a716-446655440000";
const MESSAGE_ID = "990e8400-e29b-41d4-a716-446655440000";

const mockGetUser = vi.fn();
const mockPoolQuery = vi.fn();
const mockClientQuery = vi.fn();
const mockConnect = vi.fn();
const mockRelease = vi.fn();

function normalizeSql(query: string): string {
  return query.replace(/\s+/g, " ").trim();
}

function createPostRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/support/conversation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function authorizeCustomer(accountStatus: "active" | "suspended" = "active") {
  mockGetUser.mockResolvedValue({
    data: { user: { id: CUSTOMER_ID } },
    error: null,
  });
  mockPoolQuery.mockImplementation(async (query: string) => {
    const sql = normalizeSql(query);
    if (sql.includes("FROM public.profiles")) {
      return { rows: [{ role: "customer", account_status: accountStatus }] };
    }
    throw new Error(`Unexpected pool query: ${sql}`);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockReset();
  mockPoolQuery.mockReset();
  mockClientQuery.mockReset();
  mockConnect.mockReset();
  mockRelease.mockReset();

  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: mockGetUser },
  } as never);

  vi.mocked(getPool).mockReturnValue({
    query: mockPoolQuery,
    connect: mockConnect,
  } as never);

  mockConnect.mockResolvedValue({
    query: mockClientQuery,
    release: mockRelease,
  } as never);

  authorizeCustomer();
});

describe("GET /api/support/conversation", () => {
  it("requires a signed-in user", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mockPoolQuery).not.toHaveBeenCalled();
  });

  it("rejects administrator accounts from the customer endpoint", async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ role: "admin", account_status: "active" }],
    });

    const response = await GET();

    expect(response.status).toBe(403);
    expect(mockPoolQuery).toHaveBeenCalledTimes(1);
  });

  it("returns an empty conversation when the customer has not contacted support", async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ role: "customer", account_status: "active" }],
    });
    mockPoolQuery.mockResolvedValueOnce({ rows: [] });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: { conversation: null, messages: [] },
    });
  });

  it("returns the customer's conversation and marks Admin replies as read", async () => {
    const conversation = {
      id: CONVERSATION_ID,
      status: "open",
      created_at: "2026-11-16T10:00:00.000Z",
      updated_at: "2026-11-16T10:05:00.000Z",
      last_message_at: "2026-11-16T10:05:00.000Z",
    };
    const message = {
      id: MESSAGE_ID,
      conversation_id: CONVERSATION_ID,
      sender_id: ADMIN_ID,
      sender_role: "admin",
      body: "How can we help?",
      order_id: null,
      read_at: "2026-11-16T10:06:00.000Z",
      created_at: "2026-11-16T10:05:00.000Z",
    };

    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ role: "customer", account_status: "active" }],
    });
    mockPoolQuery.mockResolvedValueOnce({ rows: [conversation] });
    mockPoolQuery.mockResolvedValueOnce({ rows: [] });
    mockPoolQuery.mockResolvedValueOnce({ rows: [message] });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.conversation.id).toBe(CONVERSATION_ID);
    expect(body.data.messages).toEqual([
      {
        id: MESSAGE_ID,
        conversationId: CONVERSATION_ID,
        senderId: ADMIN_ID,
        senderRole: "admin",
        message: "How can we help?",
        orderId: null,
        readAt: message.read_at,
        createdAt: message.created_at,
      },
    ]);
    expect(normalizeSql(mockPoolQuery.mock.calls[2][0])).toContain(
      "sender_role = 'admin' AND read_at IS NULL",
    );
  });

  it("fails safely when the profile lookup fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockPoolQuery.mockRejectedValueOnce(new Error("Simulated database failure"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect((await response.json()).message).toBe(
      "Unable to verify your support access.",
    );
  });
});

describe("POST /api/support/conversation", () => {
  it("rejects invalid JSON", async () => {
    const request = new Request("http://localhost:3000/api/support/conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{invalid",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("rejects empty and overlong messages", async () => {
    expect((await POST(createPostRequest({ message: "   " }))).status).toBe(400);
    expect((await POST(createPostRequest({ message: "a".repeat(4001) }))).status).toBe(400);
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("rejects an invalid optional order UUID", async () => {
    const response = await POST(
      createPostRequest({ message: "I have a question", orderId: "not-a-uuid" }),
    );

    expect(response.status).toBe(400);
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("allows a suspended customer to contact support", async () => {
    authorizeCustomer("suspended");
    mockClientQuery.mockImplementation(async (query: string) => {
      const sql = normalizeSql(query);
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return { rows: [] };
      if (sql.startsWith("INSERT INTO public.support_conversations")) {
        return { rows: [{ id: CONVERSATION_ID, status: "open" }] };
      }
      if (sql.startsWith("INSERT INTO public.support_messages")) {
        return {
          rows: [{
            id: MESSAGE_ID,
            conversation_id: CONVERSATION_ID,
            sender_id: CUSTOMER_ID,
            sender_role: "customer",
            body: "Please help me with my account.",
            order_id: null,
            read_at: null,
            created_at: "2026-11-16T10:00:00.000Z",
          }],
        };
      }
      return { rows: [] };
    });

    const response = await POST(
      createPostRequest({ message: "  Please help me with my account.  " }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.conversationId).toBe(CONVERSATION_ID);
    expect(body.data.message.message).toBe("Please help me with my account.");
    expect(mockClientQuery).toHaveBeenCalledWith("COMMIT");
    expect(mockClientQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE public.support_conversations"),
      expect.any(Array),
    );
    expect(mockRelease).toHaveBeenCalledOnce();
  });

  it("checks that an optional order belongs to the signed-in customer", async () => {
    mockClientQuery.mockImplementation(async (query: string) => {
      const sql = normalizeSql(query);
      if (sql === "BEGIN" || sql === "ROLLBACK") return { rows: [] };
      if (sql.startsWith("SELECT id::text FROM public.orders")) return { rows: [] };
      throw new Error(`Unexpected transaction query: ${sql}`);
    });

    const response = await POST(
      createPostRequest({ message: "Question about an order", orderId: ORDER_ID }),
    );

    expect(response.status).toBe(404);
    expect(mockClientQuery).toHaveBeenCalledWith("ROLLBACK");
    expect(mockClientQuery.mock.calls.some(([query]) =>
      String(query).includes("INSERT INTO public.support_messages"),
    )).toBe(false);
  });

  it("fails safely and rolls back when message insertion fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockClientQuery.mockImplementation(async (query: string) => {
      const sql = normalizeSql(query);
      if (sql === "BEGIN" || sql === "ROLLBACK") return { rows: [] };
      if (sql.startsWith("INSERT INTO public.support_conversations")) {
        return { rows: [{ id: CONVERSATION_ID, status: "open" }] };
      }
      if (sql.startsWith("INSERT INTO public.support_messages")) {
        throw new Error("Simulated insert failure");
      }
      return { rows: [] };
    });

    const response = await POST(createPostRequest({ message: "Please help." }));

    expect(response.status).toBe(500);
    expect(mockClientQuery).toHaveBeenCalledWith("ROLLBACK");
    expect(mockRelease).toHaveBeenCalledOnce();
  });
});
