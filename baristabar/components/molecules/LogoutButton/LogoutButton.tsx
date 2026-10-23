"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    if (isLoading) return;

    setIsLoading(true);
    setError("");

    try {
      const supabase = createClient();

      const { error: signOutError } =
        await supabase.auth.signOut();

      if (signOutError) {
        setError("Unable to sign out. Please try again.");
        return;
      }

      router.replace("/sign-in");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoading}
        className="inline-flex items-center gap-2 rounded-full border border-[#E4D9CE] px-4 py-2 text-sm font-medium text-[#3B2418] transition-colors hover:bg-[#F3EAE0] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogOut className="h-4 w-4" />
        {isLoading ? "Signing out..." : "Log out"}
      </button>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
