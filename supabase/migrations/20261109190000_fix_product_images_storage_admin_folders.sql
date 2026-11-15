
BEGIN;

-- Remove the initial broad public SELECT policy.
-- The bucket is public, so public asset URLs remain accessible.
DROP POLICY IF EXISTS
    "BaristaBar product images public read"
ON storage.objects;

-- Remove the original policies.
DROP POLICY IF EXISTS
    "BaristaBar admins upload product images"
ON storage.objects;

DROP POLICY IF EXISTS
    "BaristaBar admins update product images"
ON storage.objects;

DROP POLICY IF EXISTS
    "BaristaBar admins delete product images"
ON storage.objects;

-- Remove the manually created/current policies before recreation.
DROP POLICY IF EXISTS
    "Admins can upload product images"
ON storage.objects;

DROP POLICY IF EXISTS
    "Admins can update product images"
ON storage.objects;

DROP POLICY IF EXISTS
    "Admins can delete product images"
ON storage.objects;

DROP POLICY IF EXISTS
    "Admins can view product images"
ON storage.objects;


-- 1. INSERT: administrators only.
-- Products and categories folders are allowed.

CREATE POLICY "Admins can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1]
        IN ('products', 'categories')
    AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.role = 'admin'
    )
);


-- 2. UPDATE: administrators only.

CREATE POLICY "Admins can update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1]
        IN ('products', 'categories')
    AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.role = 'admin'
    )
)
WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1]
        IN ('products', 'categories')
    AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.role = 'admin'
    )
);


-- 3. DELETE: administrators only.

CREATE POLICY "Admins can delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1]
        IN ('products', 'categories')
    AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.role = 'admin'
    )
);


-- 4. SELECT: administrators can access object metadata
-- in both authorized folders.

CREATE POLICY "Admins can view product images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1]
        IN ('products', 'categories')
    AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.role = 'admin'
    )
);

COMMIT;
