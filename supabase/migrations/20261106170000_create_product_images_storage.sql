BEGIN;

-- 1. Create or update the product images bucket.

INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES (
    'product-images',
    'product-images',
    TRUE,
    5242880,
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/avif'
    ]
)
ON CONFLICT (id)
DO UPDATE SET
    public = TRUE,
    file_size_limit = 5242880,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Public image reading.
-- Customers can display product images without authentication.

DROP POLICY IF EXISTS
    "BaristaBar product images public read"
ON storage.objects;

CREATE POLICY "BaristaBar product images public read"
ON storage.objects
FOR SELECT
TO public
USING (
    bucket_id = 'product-images'
);

-- 3. Only administrators can upload images.

DROP POLICY IF EXISTS
    "BaristaBar admins upload product images"
ON storage.objects;

CREATE POLICY "BaristaBar admins upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = 'products'
    AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role = 'admin'
    )
);

-- 4. Only administrators can update images.

DROP POLICY IF EXISTS
    "BaristaBar admins update product images"
ON storage.objects;

CREATE POLICY "BaristaBar admins update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = 'products'
    AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role = 'admin'
    )
)
WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = 'products'
    AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role = 'admin'
    )
);

-- 5. Only administrators can delete product images.

DROP POLICY IF EXISTS
    "BaristaBar admins delete product images"
ON storage.objects;

CREATE POLICY "BaristaBar admins delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = 'products'
    AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role = 'admin'
    )
);

COMMIT;
