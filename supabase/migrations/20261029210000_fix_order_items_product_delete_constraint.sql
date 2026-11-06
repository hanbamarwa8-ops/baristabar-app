BEGIN;

-- Keep the historical product snapshot if the catalogue product is deleted.
ALTER TABLE public.order_items
DROP CONSTRAINT IF EXISTS order_items_type_check;

ALTER TABLE public.order_items
ADD CONSTRAINT order_items_type_check
CHECK (
  (
    item_type = 'product'
    AND box_slug IS NULL
  )
  OR
  (
    item_type = 'beanbox'
    AND product_id IS NULL
    AND box_slug IN (
      'discovery-box',
      'classic-box',
      'barista-box',
      'premium-box'
    )
  )
);

COMMIT;