"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ShieldAlert,
  X,
  LoaderCircle,
} from "lucide-react";

import { Logo } from "@/components/atoms/Logo";
import { LoginForm } from "@/app/admin/login/LoginForm";
import { createClient } from "@/lib/supabase/client";

interface AdminAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AccessState =
  | "checking"
  | "anonymous"
  | "customer"
  | "error";

export function AdminAccessModal({
  isOpen,
  onClose,
}: AdminAccessModalProps) {
  const router = useRouter();

  const [accessState, setAccessState] =
    useState<AccessState>("checking");

  const [retryCount, setRetryCount] = useState(0);

  // Fermeture de la fenêtre sans modifier la session Supabase.
  const handleClose = useCallback(() => {
    setAccessState("checking");
    onClose();
  }, [onClose]);

  // Vérification de la session et du rôle actuel.
  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    async function checkAdminAccess() {
      try {
        const supabase = createClient();

        // 1. Vérifier si une session existe.
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!active) return;

        if (sessionError) {
          setAccessState("error");
          return;
        }

        // Aucun utilisateur connecté : afficher le formulaire.
        if (!session?.user) {
          setAccessState("anonymous");
          return;
        }

        // 2. Vérifier l'identité auprès de Supabase Auth.
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (userError || !user) {
          setAccessState("error");
          return;
        }

        // 3. Vérifier le rôle depuis PostgreSQL.
        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        if (!active) return;

        if (profileError) {
          setAccessState("error");
          return;
        }

        // Administrateur déjà connecté.
        if (profile?.role === "admin") {
          router.replace("/admin");
          router.refresh();
          handleClose();
          return;
        }

        // Client ou compte sans rôle administrateur.
        // Aucune déconnexion n'est effectuée.
        setAccessState("customer");
      } catch {
        if (active) {
          setAccessState("error");
        }
      }
    }

    void checkAdminAccess();

    return () => {
      active = false;
    };
  }, [isOpen, retryCount, router, handleClose]);

  // Gestion du scroll et de la touche Escape.
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto bg-[#24170F]/65 px-4 py-6 backdrop-blur-sm sm:py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        className="relative my-auto max-h-[calc(100dvh-3rem)] w-full max-w-115 overflow-y-auto rounded-[28px] border border-[#E4D9CE] bg-[#FDFBF8] p-6 text-[#3B2418] shadow-[0_24px_80px_rgba(36,23,15,0.25)] sm:p-9"
      >
        {/* Bouton de fermeture */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Fermer la connexion administrateur"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-[#806F63] transition-colors hover:bg-[#E8DED4] hover:text-[#3B2418]"
        >
          <X size={20} />
        </button>

        {/* Logo */}
        <div className="mb-7 flex justify-center pr-8">
          <Logo />
        </div>

        {/* En-tête */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8DED4] text-[#3B2418]">
            <ShieldCheck size={27} strokeWidth={1.6} />
          </div>

          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8A6B55]">
            BaristaBar Management
          </p>

          <h2
            id="admin-modal-title"
            className="mt-2 text-2xl font-semibold tracking-tight text-[#3B2418]"
          >
            Accès administrateur
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#806F63]">
            Connecte-toi pour accéder à ton espace de gestion.
          </p>
        </div>

        {/* Vérification en cours */}
        {accessState === "checking" && (
          <div
            className="flex flex-col items-center gap-3 py-8 text-center"
            aria-live="polite"
          >
            <LoaderCircle
              size={30}
              className="animate-spin text-[#8A6B55]"
            />

            <p className="text-sm text-[#806F63]">
              Vérification de ta session...
            </p>
          </div>
        )}

        {/* Aucun utilisateur connecté */}
        {accessState === "anonymous" && <LoginForm />}

        {/* Utilisateur connecté, mais non administrateur */}
        {accessState === "customer" && (
          <div
            className="rounded-2xl border border-[#E4D9CE] bg-white p-5 text-center"
            aria-live="polite"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E8DED4] text-[#3B2418]">
              <ShieldAlert size={27} strokeWidth={1.6} />
            </div>

            <h3 className="text-lg font-semibold text-[#3B2418]">
              Accès réservé aux administrateurs
            </h3>

            <p className="mt-3 text-sm leading-6 text-[#806F63]">
              Tu es actuellement connecté avec un compte client.
              Ce compte ne possède pas les autorisations nécessaires
              pour accéder à l&apos;administration.
            </p>

            <div className="mt-4 rounded-xl bg-[#F8F5F0] px-4 py-3">
              <p className="text-xs leading-5 text-[#806F63]">
                Ta session client reste active. Aucune déconnexion
                n&apos;a été effectuée.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="mt-5 h-11 w-full rounded-full bg-[#3B2418] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#684733]"
            >
              Retour à la boutique
            </button>
          </div>
        )}

        {/* Erreur de vérification */}
        {accessState === "error" && (
          <div
            className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center"
            aria-live="polite"
          >
            <ShieldAlert
              size={28}
              className="mx-auto mb-3 text-red-700"
            />

            <h3 className="font-semibold text-red-900">
              Vérification impossible
            </h3>

            <p className="mt-2 text-sm leading-6 text-red-800">
              Nous ne pouvons pas vérifier ton compte actuellement.
              Ta session n&apos;a pas été volontairement déconnectée.
            </p>

            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              className="mt-5 h-11 w-full rounded-full bg-[#3B2418] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#684733]"
            >
              Réessayer
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="mt-3 text-sm font-medium text-[#806F63] hover:text-[#3B2418] hover:underline"
            >
              Fermer
            </button>
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
}
