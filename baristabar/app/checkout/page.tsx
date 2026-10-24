import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import CheckoutTemplate from "@/components/templates/CheckoutTemplate/CheckoutTemplate";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/sign-in?next=%2Fcheckout");
  }

  return <CheckoutTemplate userEmail={user.email ?? ""} />;
}