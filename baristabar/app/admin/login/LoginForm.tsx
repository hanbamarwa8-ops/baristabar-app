
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // 1. Vérifier si une session existe déjà.
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        setErrorMessage(
          "Impossible de vérifier ta session. Réessaie.",
        );
        return;
      }

      // 2. Ne jamais remplacer silencieusement une session existante.
      if (session?.user) {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setErrorMessage(
            "Impossible de vérifier ton compte actuel. Ta session n'a pas été volontairement déconnectée.",
          );
          return;
        }

        const { data: currentProfile, error: currentProfileError } =
          await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        if (currentProfileError) {
          setErrorMessage(
            "Impossible de vérifier tes autorisations. Ta session actuelle est conservée.",
          );
          return;
        }

        if (currentProfile?.role === "admin") {
          router.replace("/admin");
          router.refresh();
          return;
        }

        setErrorMessage(
          "Une session client est déjà active. Pour utiliser un autre compte administrateur, déconnecte-toi volontairement de la boutique puis réessaie. Ta session actuelle reste conservée.",
        );
        return;
      }

      // 3. Aucune session : authentification avec les identifiants saisis.
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error || !data.user) {
        setErrorMessage(
          "Connexion impossible. Vérifie ton adresse e-mail et ton mot de passe.",
        );
        return;
      }

      // 4. Vérifier le rôle depuis PostgreSQL.
      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

      // Aucun accès Admin si la vérification échoue.
      // La session reste intacte.
      if (profileError) {
        setErrorMessage(
          "Ton compte est connecté, mais nous ne pouvons pas vérifier tes autorisations. Ta session est conservée. Réessaie.",
        );
        return;
      }

      // Un compte client ne peut pas accéder à l'administration.
      // Aucune déconnexion automatique.
      if (profile?.role !== "admin") {
        setErrorMessage(
          "Ce compte ne possède pas le rôle administrateur. Ta session client reste active et tu peux continuer à utiliser la boutique.",
        );
        return;
      }

      // 5. Administrateur autorisé.
      router.replace("/admin");
      router.refresh();
    } catch {
      setErrorMessage(
        "Le service d'authentification est momentanément indisponible. Réessaie.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClassName =
    "mt-2 h-12 w-full rounded-xl border border-[#D8CABC] bg-[#FDFBF8] px-4 text-sm text-[#3B2418] outline-none transition placeholder:text-[#9A8577] focus:border-[#8A6B55] focus:ring-4 focus:ring-[#8A6B55]/10";

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {/* Adresse e-mail */}
      <div>
        <label
          htmlFor="admin-email"
          className="text-sm font-medium text-[#3B2418]"
        >
          Adresse e-mail
        </label>

        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClassName}
          placeholder="admin@exemple.com"
        />
      </div>

      {/* Mot de passe */}
      <div>
        <label
          htmlFor="admin-password"
          className="text-sm font-medium text-[#3B2418]"
        >
          Mot de passe
        </label>

        <div className="relative mt-2">
          <input
            id="admin-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`${inputClassName} pr-12`}
            placeholder="Saisir ton mot de passe"
          />

          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={
              showPassword
                ? "Masquer le mot de passe"
                : "Afficher le mot de passe"
            }
            aria-pressed={showPassword}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#806F63] transition-colors hover:bg-[#E8DED4] hover:text-[#3B2418]"
          >
            {showPassword ? (
              <EyeOff size={19} strokeWidth={1.7} />
            ) : (
              <Eye size={19} strokeWidth={1.7} />
            )}
          </button>
        </div>

        {/* Mot de passe oublié */}
        <div className="mt-2 flex justify-end">
          <Link
            href="/forgot-password?context=admin"
            className="text-xs font-medium text-[#8A6B55] transition-colors hover:text-[#3B2418] hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>
      </div>

      {/* Message d'erreur */}
      {errorMessage && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-800"
        >
          {errorMessage}
        </p>
      )}

      {/* Connexion */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#3B2418] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#684733] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Connexion en cours..." : "Se connecter"}
      </button>

      {/* Information de sécurité */}
      <p className="text-center text-xs leading-5 text-[#806F63]">
        Accès réservé aux comptes possédant le rôle administrateur dans
        Supabase. La création publique de comptes administrateurs est désactivée.
      </p>
    </form>
  );
}
