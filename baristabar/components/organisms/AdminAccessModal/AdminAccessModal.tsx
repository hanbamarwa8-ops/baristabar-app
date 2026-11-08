"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck, X } from "lucide-react";

import { Logo } from "@/components/atoms/Logo";
import { LoginForm } from "@/app/admin/login/LoginForm";

interface AdminAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminAccessModal({
  isOpen,
  onClose,
}: AdminAccessModalProps) {
  // Gestion du scroll et de la touche Escape.
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // La fenêtre est initialement fermée.
  // document.body est disponible lorsqu'elle est ouverte par l'utilisateur.
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto bg-[#24170F]/65 px-4 py-6 backdrop-blur-sm sm:py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
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
          onClick={onClose}
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

        {/* Formulaire existant */}
        <LoginForm />
      </section>
    </div>,
    document.body,
  );
}
