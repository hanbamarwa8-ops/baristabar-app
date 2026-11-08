"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  LockKeyhole,
  Eye,
  EyeOff,
} from "lucide-react";

import { Logo } from "@/components/atoms/Logo";
import { createClient } from "@/lib/supabase/client";

type PageState = "checking" | "ready" | "invalid" | "updating";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isAdminContext = searchParams.get("context") === "admin";

  const [pageState, setPageState] = useState<PageState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const url = new URL(window.location.href);

    const hasRecoveryParams =
      url.searchParams.has("recovery") ||
      url.searchParams.has("code") ||
      url.hash.includes("type=recovery");

    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === "PASSWORD_RECOVERY" && session) {
        setPageState("ready");
      }
    });

    async function checkRecoverySession() {
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (!error && data.session && hasRecoveryParams) {
        setPageState("ready");
      } else {
        setPageState("invalid");
      }
    }

    void checkRecoverySession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pageState !== "ready") return;

    setErrorMessage("");

    if (password.length < 8) {
      setErrorMessage(
        "Le mot de passe doit contenir au moins 8 caractères.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setPageState("updating");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setErrorMessage(
          error.message ||
            "Impossible de modifier le mot de passe. Demande un nouveau lien de réinitialisation.",
        );
        setPageState("ready");
        return;
      }

      await supabase.auth.signOut();

      const destination = isAdminContext
        ? "/admin/login?passwordUpdated=1"
        : "/sign-in?passwordUpdated=1";

      router.replace(destination);
      router.refresh();
    } catch {
      setErrorMessage(
        "Une erreur est survenue. Réessaie ou demande un nouveau lien.",
      );
      setPageState("ready");
    }
  }

  const inputClassName =
    "h-12 w-full rounded-xl border border-[#D8CABC] bg-[#FDFBF8] px-4 text-sm text-[#3B2418] outline-none transition placeholder:text-[#9A8577] focus:border-[#8A6B55] focus:ring-4 focus:ring-[#8A6B55]/10";

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

        {pageState === "checking" ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8DED4] text-[#3B2418]">
              <LockKeyhole size={26} />
            </div>

            <h1 className="text-2xl font-semibold">
              Vérification du lien
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#806F63]">
              Nous vérifions ton lien de réinitialisation. Merci de patienter.
            </p>
          </div>
        ) : pageState === "invalid" ? (
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8DED4] text-[#3B2418]">
              <LockKeyhole size={26} />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">
              Lien indisponible
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#806F63]">
              Ce lien a peut-être expiré ou a déjà été utilisé.
              Demande un nouveau lien pour continuer.
            </p>

            <Link
              href={
                isAdminContext
                  ? "/forgot-password?context=admin"
                  : "/forgot-password"
              }
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#3B2418] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#684733]"
            >
              Demander un nouveau lien
            </Link>
          </div>
        ) : (
          <>
            {/* En-tête */}
            <div className="mb-7 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8DED4] text-[#3B2418]">
                {isAdminContext ? (
                  <ShieldCheck size={27} strokeWidth={1.6} />
                ) : (
                  <LockKeyhole size={26} strokeWidth={1.6} />
                )}
              </div>

              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8A6B55]">
                {isAdminContext
                  ? "Administration BaristaBar"
                  : "BaristaBar Account"}
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                Nouveau mot de passe
              </h1>

              <p className="mt-3 text-sm leading-6 text-[#806F63]">
                {isAdminContext
                  ? "Choisis un nouveau mot de passe pour ton espace administrateur."
                  : "Choisis un nouveau mot de passe pour ton compte BaristaBar."}
              </p>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nouveau mot de passe */}
              <div>
                <label
                  htmlFor="new-password"
                  className="text-sm font-medium text-[#3B2418]"
                >
                  Nouveau mot de passe
                </label>

                <div className="relative mt-2">
                  <input
                    id="new-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Au moins 8 caractères"
                    className={`${inputClassName} pr-12`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((visible) => !visible)
                    }
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
              </div>

              {/* Confirmation du mot de passe */}
              <div>
                <label
                  htmlFor="confirm-password"
                  className="text-sm font-medium text-[#3B2418]"
                >
                  Confirmer le nouveau mot de passe
                </label>

                <div className="relative mt-2">
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type={
                      showConfirmPassword ? "text" : "password"
                    }
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    placeholder="Saisir à nouveau le mot de passe"
                    className={`${inputClassName} pr-12`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((visible) => !visible)
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Masquer la confirmation"
                        : "Afficher la confirmation"
                    }
                    aria-pressed={showConfirmPassword}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#806F63] transition-colors hover:bg-[#E8DED4] hover:text-[#3B2418]"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={19} strokeWidth={1.7} />
                    ) : (
                      <Eye size={19} strokeWidth={1.7} />
                    )}
                  </button>
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

              {/* Bouton de validation */}
              <button
                type="submit"
                disabled={pageState === "updating"}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#3B2418] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#684733] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pageState === "updating"
                  ? "Modification en cours..."
                  : "Enregistrer le nouveau mot de passe"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

function ResetPasswordFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F5F0] px-4 py-12">
      <section className="w-full max-w-md rounded-[28px] border border-[#E4D9CE] bg-white p-8 text-center">
        <div className="flex justify-center">
          <Logo />
        </div>

        <p className="mt-5 text-sm text-[#806F63]">
          Chargement...
        </p>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
