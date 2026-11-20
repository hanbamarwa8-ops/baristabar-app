CREATE INDEX IF NOT EXISTS order_items_product_id_idx
    ON public.order_items (product_id);
