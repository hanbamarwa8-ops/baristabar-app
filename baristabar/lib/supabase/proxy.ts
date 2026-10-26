import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Allow the app's public pages and build tooling to run before configuration
  // is added. Protected pages still fail closed in requireAdmin().
  if (!supabaseUrl || !publishableKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // Verify/refresh auth tokens so updated cookies are returned to the browser.
  await supabase.auth.getClaims();

  return supabaseResponse;
}
