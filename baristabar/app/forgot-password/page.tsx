"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/atoms/Logo";
import { createClient } from "@/lib/supabase/client";

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const isAdminContext = searchParams.get("context") === "admin";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loginHref = isAdminContext ? "/admin/login" : "/sign-in";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();

      let redirectTo: string;

      if (isAdminContext) {
        const callbackUrl = new URL(
          "/auth/callback",
          window.location.origin,
        );

        callbackUrl.searchParams.set(
          "next",
          "/admin/reset-password",
        );

        redirectTo = callbackUrl.toString();
      } else {
        // Le parcours client existant est conservé.
        redirectTo = `${window.location.origin}/reset-password`;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo },
      );

      if (error) {
        setErrorMessage(
          "Impossible d'envoyer le lien pour le moment. Réessaie.",
        );
        return;
      }

      setSent(true);
    } catch {
      setErrorMessage(
        "Une erreur est survenue. Vérifie ta connexion et réessaie.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F8F5F0] px-4 py-12 text-[#3B2418]">
      {/* Décoration d'arrière-plan */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#E8DED4]/50 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-[#D8CABC]/30 blur-3xl"
      />

      <section className="relative w-full max-w-115 rounded-[28px] border border-[#E4D9CE] bg-white/95 p-6 shadow-[0_20px_70px_rgba(59,36,24,0.09)] backdrop-blur-sm sm:p-9">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        {!sent ? (
          <>
            {/* En-tête */}
            <div className="mb-7 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8DED4] text-[#3B2418]">
                {isAdminContext ? (
                  <ShieldCheck size={27} strokeWidth={1.6} />
                ) : (
                  <Mail size={25} strokeWidth={1.6} />
                )}
              </div>

              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8A6B55]">
                {isAdminContext
                  ? "Administration BaristaBar"
                  : "BaristaBar Account"}
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                Mot de passe oublié ?
              </h1>

              <p className="mt-3 text-sm leading-6 text-[#806F63]">
                {isAdminContext
                  ? "Saisis l'adresse e-mail de ton compte administrateur. Nous t'enverrons un lien pour créer un nouveau mot de passe."
                  : "Saisis ton adresse e-mail. Nous t'enverrons un lien pour réinitialiser ton mot de passe."}
              </p>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-sm font-medium text-[#3B2418]"
                >
                  Adresse e-mail
                </label>

                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@exemple.com"
                  className="mt-2 h-12 w-full rounded-xl border border-[#D8CABC] bg-[#FDFBF8] px-4 text-sm text-[#3B2418] outline-none transition placeholder:text-[#9A8577] focus:border-[#8A6B55] focus:ring-4 focus:ring-[#8A6B55]/10"
                />
              </div>

              {errorMessage && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-800"
                >
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#3B2418] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#684733] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Envoi en cours..."
                  : "Envoyer le lien de réinitialisation"}
              </button>
            </form>
          </>
        ) : (
          /* Confirmation d'envoi */
          <div className="text-center" aria-live="polite">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#E8DED4] text-[#3B2418]">
              <Mail size={29} strokeWidth={1.6} />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">
              Vérifie ta boîte e-mail
            </h1>

            <p className="mt-4 text-sm leading-6 text-[#806F63]">
              Si un compte correspond à cette adresse, tu recevras un
              lien de réinitialisation. Vérifie également ton dossier
              des courriers indésirables.
            </p>

            <button
              type="button"
              onClick={() => {
                setSent(false);
                setErrorMessage("");
              }}
              className="mt-6 text-sm font-medium text-[#8A6B55] transition-colors hover:text-[#3B2418] hover:underline"
            >
              Utiliser une autre adresse e-mail
            </button>
          </div>
        )}

        {/* Retour à la connexion */}
        <div className="mt-8 border-t border-[#E8DED4] pt-5 text-center">
          <Link
            href={loginHref}
            className="text-sm font-medium text-[#806F63] transition-colors hover:text-[#3B2418]"
          >
            {isAdminContext
              ? "Retour à la connexion administrateur"
              : "Retour à la connexion"}
          </Link>
        </div>
      </section>
    </main>
  );
}

function ForgotPasswordFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F5F0] px-4">
      <div className="rounded-2xl border border-[#E4D9CE] bg-white p-8 text-center">
        <Logo />
        <p className="mt-5 text-sm text-[#806F63]">
          Chargement...
        </p>
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordFallback />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
