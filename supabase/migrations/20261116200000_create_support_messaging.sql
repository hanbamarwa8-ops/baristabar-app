-- BARISTABAR - ONE-TO-ONE CUSTOMER SUPPORT MESSAGING
-- One private support conversation per customer, containing multiple messages.
-- Data mutations are performed by the authenticated Next.js API using DATABASE_URL.
-- RLS is an additional protection for direct authenticated reads and Realtime.

BEGIN;

-- 1. One private conversation per customer.
CREATE TABLE IF NOT EXISTS public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL UNIQUE
    REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Conversation messages. A message may optionally refer to an order.
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL
    REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_id uuid
    REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role text NOT NULL
    CHECK (sender_role IN ('customer', 'admin')),
  body text NOT NULL
    CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
  order_id uuid
    REFERENCES public.orders(id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes for inbox ordering, thread history, and unread counts.
CREATE INDEX IF NOT EXISTS support_conversations_last_message_idx
  ON public.support_conversations (last_message_at DESC);

CREATE INDEX IF NOT EXISTS support_messages_conversation_created_idx
  ON public.support_messages (conversation_id, created_at ASC, id ASC);

CREATE INDEX IF NOT EXISTS support_messages_unread_idx
  ON public.support_messages (conversation_id, sender_role, created_at)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS support_messages_order_id_idx
  ON public.support_messages (order_id)
  WHERE order_id IS NOT NULL;

-- 4. Enable RLS. Browser users may read only their own conversation/messages;
-- administrators may read all conversations. No direct browser writes are granted.
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.support_conversations FROM anon, authenticated;
REVOKE ALL ON TABLE public.support_messages FROM anon, authenticated;

GRANT SELECT ON TABLE public.support_conversations TO authenticated;
GRANT SELECT ON TABLE public.support_messages TO authenticated;

DROP POLICY IF EXISTS support_conversations_select_customer_or_admin
  ON public.support_conversations;

CREATE POLICY support_conversations_select_customer_or_admin
  ON public.support_conversations
  FOR SELECT
  TO authenticated
  USING (
    customer_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS support_messages_select_customer_or_admin
  ON public.support_messages;

CREATE POLICY support_messages_select_customer_or_admin
  ON public.support_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.support_conversations AS c
      WHERE c.id = support_messages.conversation_id
        AND (
          c.customer_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.profiles AS p
            WHERE p.id = (SELECT auth.uid())
              AND p.role = 'admin'
          )
        )
    )
  );

-- 5. Add both tables to Supabase Realtime when the standard publication exists.
-- The check makes this section safe to run again without duplicating publication entries.
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'support_conversations'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'support_messages'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages';
    END IF;
  END IF;
END;
$migration$;

COMMENT ON TABLE public.support_conversations IS
  'One private support conversation per customer account.';

COMMENT ON TABLE public.support_messages IS
  'Stored customer/admin messages within a support conversation.';

COMMIT;
