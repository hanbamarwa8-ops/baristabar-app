import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");

  // Les destinations sont explicitement autorisées.
  // Aucun redirect externe fourni par l'utilisateur n'est accepté.
  const isAdminRecovery = next === "/admin/reset-password";

  const destination =
    next === "/checkout"
      ? "/checkout"
      : isAdminRecovery
        ? "/reset-password?recovery=1&context=admin"
        : next === "/reset-password"
          ? "/reset-password?recovery=1"
          : "/";

  const errorDestination = isAdminRecovery
    ? "/admin/login?authError=recovery"
    : "/sign-in?authError=confirmation";

  if (!code) {
    return NextResponse.redirect(
      new URL(errorDestination, requestUrl.origin),
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Supabase authentication callback failed:", error);

    return NextResponse.redirect(
      new URL(errorDestination, requestUrl.origin),
    );
  }

  return NextResponse.redirect(
    new URL(destination, requestUrl.origin),
  );
}
