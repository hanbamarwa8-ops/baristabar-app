-- BARISTABAR - CUSTOMER MANAGEMENT
-- Extend existing profiles and protect suspended customers.

BEGIN;

-- 1. Extend existing profiles.
-- Existing users will automatically receive account_status = active.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid,
  ADD COLUMN IF NOT EXISTS suspension_reason varchar(500),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();


-- 2. Account status constraints.

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_account_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_account_status_check
      CHECK (account_status IN ('active', 'suspended'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_suspension_state_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_suspension_state_check
      CHECK (
        (
          account_status = 'active'
          AND suspended_at IS NULL
          AND suspended_by IS NULL
          AND suspension_reason IS NULL
        )
        OR
        (
          account_status = 'suspended'
          AND suspended_at IS NOT NULL
        )
      );
  END IF;
END;
$migration$;


-- 3. Keep the administrator responsible for suspension.

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_suspended_by_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_suspended_by_fkey
      FOREIGN KEY (suspended_by)
      REFERENCES auth.users(id)
      ON DELETE SET NULL;
  END IF;
END;
$migration$;


-- 4. Backfill names and phone numbers from existing Auth metadata.
-- Never overwrite existing non-empty profile values.

UPDATE public.profiles AS p
SET
  full_name = COALESCE(
    NULLIF(pg_catalog.btrim(p.full_name), ''),
    NULLIF(pg_catalog.btrim(u.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(pg_catalog.btrim(u.raw_user_meta_data ->> 'name'), '')
  ),
  phone = COALESCE(
    NULLIF(pg_catalog.btrim(p.phone), ''),
    NULLIF(pg_catalog.btrim(u.phone), ''),
    NULLIF(pg_catalog.btrim(u.raw_user_meta_data ->> 'phone'), '')
  ),
  updated_at = now()
FROM auth.users AS u
WHERE p.id = u.id
  AND (
    p.full_name IS DISTINCT FROM COALESCE(
      NULLIF(pg_catalog.btrim(p.full_name), ''),
      NULLIF(pg_catalog.btrim(u.raw_user_meta_data ->> 'full_name'), ''),
      NULLIF(pg_catalog.btrim(u.raw_user_meta_data ->> 'name'), '')
    )
    OR p.phone IS DISTINCT FROM COALESCE(
      NULLIF(pg_catalog.btrim(p.phone), ''),
      NULLIF(pg_catalog.btrim(u.phone), ''),
      NULLIF(pg_catalog.btrim(u.raw_user_meta_data ->> 'phone'), '')
    )
  );


-- 5. Update the existing trigger function.
-- Keep customer as the default role.
-- Never allow signup metadata to assign administrator privileges.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id,
    role,
    full_name,
    phone,
    account_status
  )
  VALUES (
    NEW.id,
    'customer',
    COALESCE(
      NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'full_name'), ''),
      NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'name'), '')
    ),
    COALESCE(
      NULLIF(pg_catalog.btrim(NEW.phone), ''),
      NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'phone'), '')
    ),
    'active'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;


-- 6. Index for customer listing.

CREATE INDEX IF NOT EXISTS profiles_role_created_at_idx
  ON public.profiles (role, created_at DESC);


-- 7. Update orders SELECT policy.
-- Active customers can read their own orders.
-- Administrators retain access to all orders.

DROP POLICY IF EXISTS orders_select_own_or_admin
  ON public.orders;

CREATE POLICY orders_select_own_or_admin
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    (
      user_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = (SELECT auth.uid())
          AND p.role = 'customer'
          AND p.account_status = 'active'
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  );


-- 8. Update order_items SELECT policy.

DROP POLICY IF EXISTS order_items_select_own_or_admin
  ON public.order_items;

CREATE POLICY order_items_select_own_or_admin
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders AS o
      WHERE o.id = order_id
        AND (
          (
            o.user_id = (SELECT auth.uid())
            AND EXISTS (
              SELECT 1
              FROM public.profiles AS p
              WHERE p.id = (SELECT auth.uid())
                AND p.role = 'customer'
                AND p.account_status = 'active'
            )
          )
          OR EXISTS (
            SELECT 1
            FROM public.profiles AS p
            WHERE p.id = (SELECT auth.uid())
              AND p.role = 'admin'
          )
        )
    )
  );


-- 9. Update order_item_components SELECT policy.

DROP POLICY IF EXISTS order_item_components_select_own_or_admin
  ON public.order_item_components;

CREATE POLICY order_item_components_select_own_or_admin
  ON public.order_item_components
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.order_items AS oi
      JOIN public.orders AS o ON o.id = oi.order_id
      WHERE oi.id = order_item_id
        AND (
          (
            o.user_id = (SELECT auth.uid())
            AND EXISTS (
              SELECT 1
              FROM public.profiles AS p
              WHERE p.id = (SELECT auth.uid())
                AND p.role = 'customer'
                AND p.account_status = 'active'
            )
          )
          OR EXISTS (
            SELECT 1
            FROM public.profiles AS p
            WHERE p.id = (SELECT auth.uid())
              AND p.role = 'admin'
          )
        )
    )
  );


COMMIT;