BEGIN;

-- 1. Create categories table

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL,

    description TEXT,
    image_url TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT categories_slug_unique UNIQUE (slug),

    CONSTRAINT categories_name_not_empty
        CHECK (LENGTH(BTRIM(name)) > 0),

    CONSTRAINT categories_slug_not_empty
        CHECK (LENGTH(BTRIM(slug)) > 0),

    CONSTRAINT categories_sort_order_check
        CHECK (sort_order >= 0)
);

-- 2. Unique normalized category name

CREATE UNIQUE INDEX IF NOT EXISTS
    categories_name_normalized_unique_idx
ON public.categories (LOWER(BTRIM(name)));

-- 3. Insert existing BaristaBar categories

INSERT INTO public.categories (
    name,
    slug,
    description,
    is_active,
    sort_order
)
VALUES
(
    'Coffee Beans',
    'coffee-beans',
    'Discover exceptional coffee beans from distinctive origins.',
    TRUE,
    10
),
(
    'Ground Coffee',
    'ground-coffee',
    'Explore carefully selected ground coffees.',
    TRUE,
    20
),
(
    'Coffee Capsules',
    'coffee-capsules',
    'Enjoy convenient coffee capsules with rich aromas.',
    TRUE,
    30
),
(
    'Syrups & Flavours',
    'syrups-flavours',
    'Bring a new dimension to your coffee.',
    TRUE,
    40
),
(
    'Accessories',
    'accessories',
    'Discover practical tools for preparing coffee.',
    TRUE,
    50
),
(
    'Coffee Machines',
    'coffee-machines',
    'Explore coffee preparation equipment.',
    TRUE,
    60
),
(
    'Gift Boxes',
    'gift-boxes',
    'Find thoughtful coffee gifts.',
    TRUE,
    70
)
ON CONFLICT (slug)
DO UPDATE SET
    name = EXCLUDED.name,
    description = COALESCE(
        public.categories.description,
        EXCLUDED.description
    ),
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- 4. Add category_id to existing products

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS category_id UUID;

-- 5. Create product/category relationship

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.products'::regclass
          AND conname = 'products_category_id_fkey'
    ) THEN
        ALTER TABLE public.products
        ADD CONSTRAINT products_category_id_fkey
        FOREIGN KEY (category_id)
        REFERENCES public.categories(id)
        ON DELETE RESTRICT;
    END IF;
END;
$$;

-- 6. Associate existing products with categories

UPDATE public.products AS p
SET category_id = c.id
FROM public.categories AS c
WHERE p.category_id IS NULL
  AND LOWER(BTRIM(p.category)) = LOWER(BTRIM(c.name));

-- 7. Stop if any product has no matching category

DO $$
DECLARE
    unmatched_categories TEXT;
BEGIN
    SELECT STRING_AGG(unmatched.category, ', ')
    INTO unmatched_categories
    FROM (
        SELECT DISTINCT COALESCE(
            NULLIF(BTRIM(category), ''),
            '<empty>'
        ) AS category
        FROM public.products
        WHERE category_id IS NULL
    ) AS unmatched;

    IF unmatched_categories IS NOT NULL THEN
        RAISE EXCEPTION
            'Some products could not be associated with a category: %',
            unmatched_categories;
    END IF;
END;
$$;

-- 8. Indexes

CREATE INDEX IF NOT EXISTS
    products_category_id_idx
ON public.products (category_id);

CREATE INDEX IF NOT EXISTS
    categories_active_sort_idx
ON public.categories (is_active, sort_order, name);

-- 9. Create a dedicated updated_at trigger function.
-- This function does not depend on public.set_updated_at().

CREATE OR REPLACE FUNCTION public.categories_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- 10. Attach updated_at trigger

DROP TRIGGER IF EXISTS categories_set_updated_at
ON public.categories;

CREATE TRIGGER categories_set_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.categories_set_updated_at();

-- 11. Enable Row Level Security

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.categories
FROM anon, authenticated;

GRANT SELECT ON TABLE public.categories
TO anon, authenticated;

DROP POLICY IF EXISTS categories_public_read_active
ON public.categories;

CREATE POLICY categories_public_read_active
ON public.categories
FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);

COMMIT;
