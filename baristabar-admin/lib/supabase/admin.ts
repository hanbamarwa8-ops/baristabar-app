import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Protect server-rendered admin pages with a verified Supabase user and a
 * server-only email allow-list. Configure ADMIN_EMAIL in .env.local.
 * Public signup is intentionally not provided in the admin app.
 */
export async function requireAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!adminEmail) {
    throw new Error(
      "ADMIN_EMAIL is missing. Add the administrator's Supabase Auth email to baristabar-admin/.env.local.",
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  if ((user.email ?? "").trim().toLowerCase() !== adminEmail) {
    redirect("/unauthorized");
  }

  return user;
}
