CREATE TABLE public.api_rate_limits (
    key_hash text PRIMARY KEY,
    window_started_at timestamptz NOT NULL,
    request_count integer NOT NULL DEFAULT 1,
    expires_at timestamptz NOT NULL,

    CONSTRAINT api_rate_limits_key_hash_format
        CHECK (key_hash ~ '^[0-9a-f]{64}$'),

    CONSTRAINT api_rate_limits_request_count_positive
        CHECK (request_count >= 1),

    CONSTRAINT api_rate_limits_expiry_after_start
        CHECK (expires_at > window_started_at)
);

CREATE INDEX api_rate_limits_expires_at_idx
    ON public.api_rate_limits (expires_at);

ALTER TABLE public.api_rate_limits
    ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES
    ON TABLE public.api_rate_limits
    FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON TABLE public.api_rate_limits IS
    'Internal PostgreSQL rate-limit counters. Caller keys are stored as HMAC hashes.';
