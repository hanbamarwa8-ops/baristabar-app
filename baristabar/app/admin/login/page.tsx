import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/atoms/Logo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Connexion administrateur | BaristaBar",
  description:
    "Accéder à l'espace d'administration BaristaBar.",
};

export default function LoginPage() {
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
        <div className="mb-9 flex justify-center">
          <Logo />
        </div>

        {/* En-tête */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8DED4] text-[#3B2418]">
            <ShieldCheck size={27} strokeWidth={1.6} />
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8A6B55]">
            Administration BaristaBar
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#3B2418]">
            Espace administrateur
          </h1>

          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#806F63]">
            Connecte-toi avec ton compte administrateur pour gérer
            la boutique et suivre les commandes.
          </p>
        </div>

        {/* Formulaire de connexion */}
        <LoginForm />

        {/* Retour à la boutique */}
        <div className="mt-8 border-t border-[#E8DED4] pt-5">
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center gap-2 text-sm font-medium text-[#806F63] transition-colors hover:text-[#3B2418]"
          >
            <ArrowLeft size={16} />
            Retour à la boutique
          </Link>
        </div>
      </section>
    </main>
  );
}
