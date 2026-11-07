
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export function AdminSignOutButton() {
  const router = useRouter();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSignOut() {
    if (isSigningOut) return;

    setErrorMessage("");
    setIsSigningOut(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Sign-out failed:", error.message);
        setErrorMessage("Unable to sign out. Please try again.");
        return;
      }

      router.replace("/admin/login");
      router.refresh();
    } catch (error) {
      console.error("Unexpected sign-out error:", error);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {errorMessage && (
        <p role="alert" className="text-xs text-red-700">
          {errorMessage}
        </p>
      )}

      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#E4D9CE] bg-transparent px-4 py-2 text-sm font-medium text-[#3B2418] transition-colors hover:bg-[#F3EAE0] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogOut size={16} />
        {isSigningOut ? "Signing out..." : "Log out"}
      </button>
    </div>
  );
}
