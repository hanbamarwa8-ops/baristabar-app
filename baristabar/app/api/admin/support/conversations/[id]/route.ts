import { NextResponse } from "next/server";
import type { PoolClient } from "pg";

import { getPool } from "@/lib/db";
import { requireAdminApi } from "@/lib/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MESSAGE_HISTORY_LIMIT = 100;
const MAX_MESSAGE_LENGTH = 4_000;

type RouteContext = { params: Promise<{ id: string }> };
type ConversationStatus = "open" | "closed";

interface ConversationRow {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_status: "active" | "suspended" | null;
  status: ConversationStatus;
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

async function rollbackQuietly(client: PoolClient, transactionActive: boolean) {
  if (!transactionActive) return;
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserve the original error.
  }
}

function parseReplyPayload(value: unknown): { message: string; orderId: string | null } {
  if (!isRecord(value) || typeof value.message !== "string") {
    throw new ApiError("message must be a string.", 400);
  }

  const message = value.message.trim();
  const messageLength = [...message].length;
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

  return { message, orderId };
}

function parseStatusPayload(value: unknown): ConversationStatus {
  if (!isRecord(value) || (value.status !== "open" && value.status !== "closed")) {
    throw new ApiError("status must be either 'open' or 'closed'.", 400);
  }
  return value.status;
}

async function loadConversationForUpdate(
  client: PoolClient,
  id: string,
): Promise<ConversationRow> {
  const result = await client.query<ConversationRow>(
    `
      SELECT
        c.id::text,
        c.customer_id::text,
        COALESCE(
          NULLIF(BTRIM(p.full_name), ''),
          NULLIF(BTRIM(u.raw_user_meta_data ->> 'full_name'), ''),
          NULLIF(BTRIM(u.raw_user_meta_data ->> 'name'), ''),
          'Customer'
        ) AS customer_name,
        NULLIF(BTRIM(u.email), '') AS customer_email,
        COALESCE(
          NULLIF(BTRIM(p.phone), ''),
          NULLIF(BTRIM(u.phone), ''),
          NULLIF(BTRIM(u.raw_user_meta_data ->> 'phone'), '')
        ) AS customer_phone,
        p.account_status AS customer_status,
        c.status,
        c.created_at,
        c.updated_at,
        c.last_message_at
      FROM public.support_conversations c
      LEFT JOIN public.profiles p ON p.id = c.customer_id
      LEFT JOIN auth.users u ON u.id = c.customer_id
      WHERE c.id = $1::uuid
      FOR UPDATE OF c
    `,
    [id],
  );

  const conversation = result.rows[0];
  if (!conversation) throw new ApiError("Conversation not found.", 404);
  return conversation;
}

function serializeConversation(row: ConversationRow) {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    customerStatus: row.customer_status,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
  };
}

function serializeMessage(message: MessageRow) {
  return {
    id: message.id,
    conversationId: message.conversation_id,
    senderId: message.sender_id,
    senderRole: message.sender_role,
    message: message.body,
    orderId: message.order_id,
    readAt: message.read_at,
    createdAt: message.created_at,
  };
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("A valid conversation ID is required.", 400);

  let client: PoolClient | null = null;
  let transactionActive = false;
  try {
    client = await getPool().connect();
    await client.query("BEGIN");
    transactionActive = true;

    const conversation = await loadConversationForUpdate(client, id);

    // Opening a thread in the Admin inbox marks incoming customer messages as read.
    await client.query(
      `
        UPDATE public.support_messages
        SET read_at = now()
        WHERE conversation_id = $1::uuid
          AND sender_role = 'customer'
          AND read_at IS NULL
      `,
      [id],
    );

    const messagesResult = await client.query<MessageRow>(
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
      [id, MESSAGE_HISTORY_LIMIT],
    );

    await client.query("COMMIT");
    transactionActive = false;

    return NextResponse.json(
      {
        success: true,
        data: {
          conversation: serializeConversation(conversation),
          messages: messagesResult.rows.map(serializeMessage),
          historyLimit: MESSAGE_HISTORY_LIMIT,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (client) await rollbackQuietly(client, transactionActive);
    if (error instanceof ApiError) return jsonError(error.message, error.statusCode);
    console.error("Failed to retrieve Admin support conversation:", error);
    return jsonError("Unable to retrieve this support conversation.", 500);
  } finally {
    client?.release();
  }
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("A valid conversation ID is required.", 400);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError("A valid JSON body is required.", 400);
  }

  let payload: ReturnType<typeof parseReplyPayload>;
  try {
    payload = parseReplyPayload(rawBody);
  } catch (error) {
    if (error instanceof ApiError) return jsonError(error.message, error.statusCode);
    return jsonError("Invalid support reply.", 400);
  }

  let client: PoolClient | null = null;
  let transactionActive = false;
  try {
    client = await getPool().connect();
    await client.query("BEGIN");
    transactionActive = true;

    const conversation = await loadConversationForUpdate(client, id);

    if (payload.orderId) {
      const orderResult = await client.query<{ id: string }>(
        `
          SELECT id::text
          FROM public.orders
          WHERE id = $1::uuid
            AND user_id = $2::uuid
          LIMIT 1
        `,
        [payload.orderId, conversation.customer_id],
      );
      if (!orderResult.rows[0]) {
        throw new ApiError("The selected order does not belong to this customer.", 404);
      }
    }

    // An Admin reply reopens a closed conversation so the customer can answer.
    const messageResult = await client.query<MessageRow>(
      `
        INSERT INTO public.support_messages (
          conversation_id,
          sender_id,
          sender_role,
          body,
          order_id
        )
        VALUES ($1::uuid, $2::uuid, 'admin', $3, $4::uuid)
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
      [id, auth.userId, payload.message, payload.orderId],
    );

    const message = messageResult.rows[0];
    if (!message) throw new Error("Support reply could not be created.");

    await client.query(
      `
        UPDATE public.support_conversations
        SET status = 'open', updated_at = now(), last_message_at = $2
        WHERE id = $1::uuid
      `,
      [id, message.created_at],
    );

    await client.query("COMMIT");
    transactionActive = false;

    return NextResponse.json(
      {
        success: true,
        message: "Your reply has been sent.",
        data: {
          conversationId: id,
          status: "open",
          message: serializeMessage(message),
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (client) await rollbackQuietly(client, transactionActive);
    if (error instanceof ApiError) return jsonError(error.message, error.statusCode);
    console.error("Failed to send Admin support reply:", error);
    return jsonError("Unable to send your support reply.", 500);
  } finally {
    client?.release();
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("A valid conversation ID is required.", 400);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError("A valid JSON body is required.", 400);
  }

  let requestedStatus: ConversationStatus;
  try {
    requestedStatus = parseStatusPayload(rawBody);
  } catch (error) {
    if (error instanceof ApiError) return jsonError(error.message, error.statusCode);
    return jsonError("Invalid conversation status.", 400);
  }

  let client: PoolClient | null = null;
  let transactionActive = false;
  try {
    client = await getPool().connect();
    await client.query("BEGIN");
    transactionActive = true;

    const conversation = await loadConversationForUpdate(client, id);
    if (conversation.status === requestedStatus) {
      await client.query("COMMIT");
      transactionActive = false;
      return NextResponse.json(
        {
          success: true,
          message: "Conversation already has the requested status.",
          data: { id, status: conversation.status },
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    await client.query(
      `
        UPDATE public.support_conversations
        SET status = $2, updated_at = now()
        WHERE id = $1::uuid
      `,
      [id, requestedStatus],
    );

    await client.query("COMMIT");
    transactionActive = false;

    return NextResponse.json(
      {
        success: true,
        message: requestedStatus === "closed"
          ? "Conversation closed."
          : "Conversation reopened.",
        data: { id, status: requestedStatus },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (client) await rollbackQuietly(client, transactionActive);
    if (error instanceof ApiError) return jsonError(error.message, error.statusCode);
    console.error("Failed to update support conversation status:", error);
    return jsonError("Unable to update conversation status.", 500);
  } finally {
    client?.release();
  }
}
