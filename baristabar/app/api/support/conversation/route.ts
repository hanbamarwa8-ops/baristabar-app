import { NextResponse } from "next/server";
import type { PoolClient } from "pg";

import { getPool } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGE_LENGTH = 4_000;
const MESSAGE_HISTORY_LIMIT = 100;

interface CustomerProfileRow {
  role: string;
  account_status: "active" | "suspended";
}

interface ConversationRow {
  id: string;
  status: "open" | "closed";
  created_at: Date | string;
  updated_at: Date | string;
  last_message_at: Date | string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_role: "customer" | "admin";
  body: string;
  order_id: string | null;
  read_at: Date | string | null;
  created_at: Date | string;
}

class ApiError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
    this.name = "ApiError";
  }
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function requireCustomer() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        ok: false as const,
        response: jsonError("You must be signed in to contact support.", 401),
      };
    }

    // DATABASE_URL uses the postgres role, which bypasses RLS. Always verify
    // the authenticated user's profile and role explicitly in the API.
    const profileResult = await getPool().query<CustomerProfileRow>(
      `
        SELECT role, account_status
        FROM public.profiles
        WHERE id = $1::uuid
        LIMIT 1
      `,
      [user.id],
    );

    const profile = profileResult.rows[0];
    if (!profile || profile.role !== "customer") {
      return {
        ok: false as const,
        response: jsonError("Only customer accounts can use this support inbox.", 403),
      };
    }

    // Suspended customers may still contact support to discuss their account.
    return { ok: true as const, userId: user.id };
  } catch (error) {
    console.error("Support customer authentication failed:", error);
    return {
      ok: false as const,
      response: jsonError("Unable to verify your support access.", 500),
    };
  }
}

async function rollbackQuietly(client: PoolClient, transactionActive: boolean) {
  if (!transactionActive) return;
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserve the original error.
  }
}

function parseMessagePayload(value: unknown): {
  body: string;
  orderId: string | null;
} {
  if (!isRecord(value)) {
    throw new ApiError("A valid JSON object is required.", 400);
  }

  if (typeof value.message !== "string") {
    throw new ApiError("message must be a string.", 400);
  }

  const body = value.message.trim();
  const messageLength = [...body].length;
  if (messageLength < 1 || messageLength > MAX_MESSAGE_LENGTH) {
    throw new ApiError(
      `Messages must contain between 1 and ${MAX_MESSAGE_LENGTH} characters.`,
      400,
    );
  }

  let orderId: string | null = null;
  if (value.orderId !== undefined && value.orderId !== null && value.orderId !== "") {
    if (typeof value.orderId !== "string" || !isUuid(value.orderId)) {
      throw new ApiError("orderId must be a valid UUID.", 400);
    }
    orderId = value.orderId;
  }

  return { body, orderId };
}

export async function GET() {
  const auth = await requireCustomer();
  if (!auth.ok) return auth.response;

  try {
    const pool = getPool();
    const conversationResult = await pool.query<ConversationRow>(
      `
        SELECT
          id::text,
          status,
          created_at,
          updated_at,
          last_message_at
        FROM public.support_conversations
        WHERE customer_id = $1::uuid
        LIMIT 1
      `,
      [auth.userId],
    );

    const conversation = conversationResult.rows[0];
    if (!conversation) {
      return NextResponse.json(
        { success: true, data: { conversation: null, messages: [] } },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    // Opening the conversation marks Admin replies as read by this customer.
    await pool.query(
      `
        UPDATE public.support_messages
        SET read_at = now()
        WHERE conversation_id = $1::uuid
          AND sender_role = 'admin'
          AND read_at IS NULL
      `,
      [conversation.id],
    );

    const messagesResult = await pool.query<MessageRow>(
      `
        SELECT
          id::text,
          conversation_id::text,
          sender_id::text,
          sender_role,
          body,
          order_id::text,
          read_at,
          created_at
        FROM (
          SELECT
            id,
            conversation_id,
            sender_id,
            sender_role,
            body,
            order_id,
            read_at,
            created_at
          FROM public.support_messages
          WHERE conversation_id = $1::uuid
          ORDER BY created_at DESC, id DESC
          LIMIT $2::int
        ) AS recent_messages
        ORDER BY created_at ASC, id ASC
      `,
      [conversation.id, MESSAGE_HISTORY_LIMIT],
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          conversation: {
            id: conversation.id,
            status: conversation.status,
            createdAt: conversation.created_at,
            updatedAt: conversation.updated_at,
            lastMessageAt: conversation.last_message_at,
          },
          messages: messagesResult.rows.map((message) => ({
            id: message.id,
            conversationId: message.conversation_id,
            senderId: message.sender_id,
            senderRole: message.sender_role,
            message: message.body,
            orderId: message.order_id,
            readAt: message.read_at,
            createdAt: message.created_at,
          })),
          historyLimit: MESSAGE_HISTORY_LIMIT,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to retrieve customer support conversation:", error);
    return jsonError("Unable to retrieve your support conversation.", 500);
  }
}

export async function POST(request: Request) {
  const auth = await requireCustomer();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("A valid JSON body is required.", 400);
  }

  let payload: ReturnType<typeof parseMessagePayload>;
  try {
    payload = parseMessagePayload(body);
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error.message, error.statusCode);
    }
    return jsonError("Invalid support message.", 400);
  }

  let client: PoolClient | null = null;
  let transactionActive = false;

  try {
    client = await getPool().connect();
    await client.query("BEGIN");
    transactionActive = true;

    if (payload.orderId) {
      const orderResult = await client.query<{ id: string }>(
        `
          SELECT id::text
          FROM public.orders
          WHERE id = $1::uuid
            AND user_id = $2::uuid
          LIMIT 1
        `,
        [payload.orderId, auth.userId],
      );

      if (!orderResult.rows[0]) {
        throw new ApiError("The selected order was not found for this account.", 404);
      }
    }

    // The unique customer_id constraint guarantees one conversation per customer.
    // A new customer message automatically reopens a previously closed conversation.
    const conversationResult = await client.query<{ id: string; status: "open" | "closed" }>(
      `
        INSERT INTO public.support_conversations (customer_id, status)
        VALUES ($1::uuid, 'open')
        ON CONFLICT (customer_id)
        DO UPDATE SET
          status = 'open',
          updated_at = now()
        RETURNING id::text, status
      `,
      [auth.userId],
    );

    const conversation = conversationResult.rows[0];
    if (!conversation) {
      throw new Error("Support conversation could not be created.");
    }

    const messageResult = await client.query<MessageRow>(
      `
        INSERT INTO public.support_messages (
          conversation_id,
          sender_id,
          sender_role,
          body,
          order_id
        )
        VALUES ($1::uuid, $2::uuid, 'customer', $3, $4::uuid)
        RETURNING
          id::text,
          conversation_id::text,
          sender_id::text,
          sender_role,
          body,
          order_id::text,
          read_at,
          created_at
      `,
      [conversation.id, auth.userId, payload.body, payload.orderId],
    );

    const message = messageResult.rows[0];
    if (!message) {
      throw new Error("Support message could not be created.");
    }

    await client.query(
      `
        UPDATE public.support_conversations
        SET last_message_at = $2, updated_at = now(), status = 'open'
        WHERE id = $1::uuid
      `,
      [conversation.id, message.created_at],
    );

    await client.query("COMMIT");
    transactionActive = false;

    return NextResponse.json(
      {
        success: true,
        message: "Your message has been sent to BaristaBar support.",
        data: {
          conversationId: conversation.id,
          status: "open",
          message: {
            id: message.id,
            conversationId: message.conversation_id,
            senderId: message.sender_id,
            senderRole: message.sender_role,
            message: message.body,
            orderId: message.order_id,
            readAt: message.read_at,
            createdAt: message.created_at,
          },
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (client) await rollbackQuietly(client, transactionActive);

    if (error instanceof ApiError) {
      return jsonError(error.message, error.statusCode);
    }

    console.error("Failed to send customer support message:", error);
    return jsonError("Unable to send your support message.", 500);
  } finally {
    client?.release();
  }
}
