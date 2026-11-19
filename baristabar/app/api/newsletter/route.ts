import { NextResponse } from "next/server";

import { consumeRateLimit, getRequestIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_PATTERN =
  /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1_000;

const SUCCESS_MESSAGE =
  "Thank you for subscribing to the BaristaBar newsletter.";

function jsonResponse(
  message: string,
  status = 200,
  additionalHeaders: Record<string, string> = {},
) {
  return NextResponse.json(
    { message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...additionalHeaders,
      },
    },
  );
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export async function POST(request: Request) {
  // 1. Protection against repeated subscription attempts.
  // Five attempts per IP address in a one-hour window.
  try {
    const rateLimit = await consumeRateLimit(
      `newsletter:${getRequestIp(request)}`,
      RATE_LIMIT,
      RATE_LIMIT_WINDOW_MS,
    );

    if (!rateLimit.allowed) {
      return jsonResponse(
        "Too many subscription attempts. Please try again later.",
        429,
        {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      );
    }
  } catch (error) {
    // Fail closed: do not accept public subscriptions if the
    // anti-abuse protection cannot be verified.
    console.error("Newsletter rate-limit check failed:", error);

    return jsonResponse(
      "Newsletter service is temporarily unavailable.",
      503,
    );
  }

  // 2. Parse the JSON request body.
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      "Please enter a valid email address.",
      400,
    );
  }

  // 3. Validate the payload structure.
  if (!isRecord(body) || typeof body.email !== "string") {
    return jsonResponse(
      "Please enter a valid email address.",
      400,
    );
  }

  // 4. Normalize and validate the email.
  const email = body.email.trim().toLowerCase();

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return jsonResponse(
      "Please enter a valid email address.",
      400,
    );
  }

  // 5. Save the subscription in Supabase.
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email });

    // Treat duplicate subscriptions as successful requests.
    // This avoids exposing newsletter membership information.
    if (error?.code === "23505") {
      return jsonResponse(SUCCESS_MESSAGE);
    }

    if (error) {
      console.error(
        "Newsletter subscription failed:",
        error.code ?? "UNKNOWN_ERROR",
      );

      return jsonResponse(
        "We could not complete your subscription. Please try again later.",
        500,
      );
    }

    return jsonResponse(SUCCESS_MESSAGE);
  } catch (error) {
    console.error("Newsletter database operation failed:", error);

    return jsonResponse(
      "We could not complete your subscription. Please try again later.",
      500,
    );
  }
}
