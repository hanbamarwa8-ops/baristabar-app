import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const EMAIL_PATTERN =
  /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("email" in body) ||
    typeof body.email !== "string"
  ) {
    return NextResponse.json(
      { message: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const email = body.email.trim().toLowerCase();

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { message: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email });

    if (error?.code === "23505") {
      return NextResponse.json({
        message: "This email is already subscribed to the newsletter.",
      });
    }

    if (error) {
      console.error(
        "Newsletter subscription failed:",
        error.code,
      );

      return NextResponse.json(
        {
          message:
            "We could not complete your subscription. Please try again later.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message:
        "Thank you for subscribing to the BaristaBar newsletter.",
    });
  } catch {
    return NextResponse.json(
      {
        message:
          "We could not complete your subscription. Please try again later.",
      },
      { status: 500 },
    );
  }
}
