"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AdminSignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSignOut() {
    setErrorMessage("");
    setIsSigningOut(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Sign-out failed:", error.message);
        setErrorMessage("La déconnexion a échoué. Réessaie.");
        return;
      }

      router.replace("/admin/login");
      router.refresh();
    } catch (error) {
      console.error("Unexpected sign-out error:", error);
      setErrorMessage("Impossible de terminer la déconnexion.");
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
        className="inline-flex h-10 items-center justify-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSigningOut ? "Déconnexion…" : "Se déconnecter"}
      </button>
    </div>
  );
}
