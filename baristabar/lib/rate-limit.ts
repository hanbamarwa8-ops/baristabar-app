import { createHmac } from "node:crypto";

import { getPool } from "@/lib/db";

interface RateLimitRow {
  request_count: number | string;
  window_started_at: Date | string;
  database_now: Date | string;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Fixed-window rate limiter backed by PostgreSQL.
 * Only an HMAC of the caller key is stored.
 */
export async function consumeRateLimit(
  callerKey: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (!callerKey.trim()) {
    throw new Error("A non-empty rate-limit key is required.");
  }

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Rate limit must be a positive integer.");
  }

  if (!Number.isInteger(windowMs) || windowMs < 1000) {
    throw new Error("Rate-limit window must be at least one second.");
  }

  const hmacSecret =
    process.env.RATE_LIMIT_SECRET?.trim() ||
    process.env.DATABASE_URL?.trim();

  if (!hmacSecret) {
    throw new Error(
      "RATE_LIMIT_SECRET or DATABASE_URL is required.",
    );
  }

  const keyHash = createHmac("sha256", hmacSecret)
    .update(`baristabar-rate-limit:${callerKey}`)
    .digest("hex");

  const pool = getPool();

  // Delete at most 100 expired records per request.
  await pool.query(
    `DELETE FROM public.api_rate_limits
     WHERE key_hash IN (
       SELECT key_hash
       FROM public.api_rate_limits
       WHERE expires_at <= now()
       ORDER BY expires_at ASC
       LIMIT 100
     )`,
  );

  const result = await pool.query<RateLimitRow>(
    `INSERT INTO public.api_rate_limits (
       key_hash,
       window_started_at,
       request_count,
       expires_at
     )
     VALUES (
       $1,
       now(),
       1,
       now() + ($2::bigint * interval '1 millisecond')
     )
     ON CONFLICT (key_hash) DO UPDATE SET
       request_count = CASE
         WHEN public.api_rate_limits.window_started_at
           + ($2::bigint * interval '1 millisecond') <= now()
         THEN 1
         ELSE public.api_rate_limits.request_count + 1
       END,
       window_started_at = CASE
         WHEN public.api_rate_limits.window_started_at
           + ($2::bigint * interval '1 millisecond') <= now()
         THEN now()
         ELSE public.api_rate_limits.window_started_at
       END,
       expires_at = CASE
         WHEN public.api_rate_limits.window_started_at
           + ($2::bigint * interval '1 millisecond') <= now()
         THEN now() + ($2::bigint * interval '1 millisecond')
         ELSE public.api_rate_limits.expires_at
       END
     RETURNING
       request_count,
       window_started_at,
       now() AS database_now`,
    [keyHash, windowMs],
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("The rate-limit query returned no result.");
  }

  const requestCount = Number(row.request_count);

  const windowStartedAt =
    row.window_started_at instanceof Date
      ? row.window_started_at.getTime()
      : Date.parse(row.window_started_at);

  const databaseNow =
    row.database_now instanceof Date
      ? row.database_now.getTime()
      : Date.parse(row.database_now);

  if (
    !Number.isFinite(windowStartedAt) ||
    !Number.isFinite(databaseNow) ||
    !Number.isFinite(requestCount)
  ) {
    throw new Error("Invalid rate-limit database response.");
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil(
      (windowStartedAt + windowMs - databaseNow) / 1000,
    ),
  );

  return {
    allowed: requestCount <= limit,
    retryAfterSeconds:
      requestCount <= limit ? 0 : retryAfterSeconds,
  };
}

/**
 * Extracts the client IP supplied by the hosting proxy.
 */
export function getRequestIp(request: Request): string {
  const firstAddress = (
    value: string | null,
  ): string | undefined =>
    value
      ?.split(",")
      .map((address) => address.trim())
      .find(Boolean);

  return (
    firstAddress(request.headers.get("x-real-ip")) ??
    firstAddress(request.headers.get("x-forwarded-for")) ??
    "unknown"
  );
}
