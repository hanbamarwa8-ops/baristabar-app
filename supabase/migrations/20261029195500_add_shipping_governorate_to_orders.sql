BEGIN;

-- Add the column only if it does not already exist.
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shipping_governorate VARCHAR(120);

-- Add the constraint only if it does not already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
      AND conname = 'orders_shipping_governorate_not_empty'
  ) THEN
    ALTER TABLE public.orders
    ADD CONSTRAINT orders_shipping_governorate_not_empty
    CHECK (
      shipping_governorate IS NULL
      OR length(btrim(shipping_governorate)) > 0
    );
  END IF;
END $$;

COMMIT;