"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Logo } from "@/components/atoms/Logo";

const footerLinks = [
  { href: "/shop", label: "Shop" },
  { href: "/discovery", label: "Discovery" },
  { href: "/recipes", label: "Recipes" },
];

export function Footer() {
  const pathname = usePathname();

  const beanBoxHref =
    pathname === "/" ? "#beanbox" : "/#beanbox";

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage(
      "Newsletter signup is coming soon. Your email has not been registered."
    );
  }

  return (
    <footer className="border-t border-stone-200 bg-[#F8F5F0] px-6 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-310 py-12 sm:py-14 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_0.7fr_1.3fr] lg:gap-16">
          {/* Brand */}
          <div>
            <Logo />

            <p className="mt-4 max-w-xs font-serif text-lg leading-7 text-[#6F5140]">
              Discover your coffee.
              <br />
              Brew your experience.
            </p>
          </div>

          {/* Footer navigation */}
          <nav aria-label="Footer navigation">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6B55]">
              Explore
            </h2>

            <ul className="mt-5 space-y-3">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-stone-600 transition-colors hover:text-[#3B2418] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6B55] focus-visible:ring-offset-4"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}

              <li>
                <Link
                  href={beanBoxHref}
                  className="text-sm text-stone-600 transition-colors hover:text-[#3B2418] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6B55] focus-visible:ring-offset-4"
                >
                  BeanBox
                </Link>
              </li>
            </ul>
          </nav>

          {/* Newsletter */}
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6B55]">
              Stay in the loop
            </h2>

            <p className="mt-4 max-w-sm text-sm leading-6 text-stone-500">
              Receive coffee discoveries, brewing tips and news from BaristaBar.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-5 flex max-w-md items-end gap-4 border-b border-stone-300 pb-3 focus-within:border-[#8A6B55]"
            >
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="footer-email"
                  className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6F5140]"
                >
                  Email address
                </label>

                <input
                  id="footer-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setMessage("");
                  }}
                  className="w-full bg-transparent py-1 text-sm text-[#3B2418] outline-none placeholder:text-stone-400"
                />
              </div>

              <button
                type="submit"
                className="shrink-0 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3B2418] transition-colors hover:text-[#8A6B55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6B55]"
              >
                Join →
              </button>
            </form>

            {message && (
              <p
                role="status"
                aria-live="polite"
                className="mt-3 text-xs leading-5 text-stone-500"
              >
                {message}
              </p>
            )}
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 border-t border-stone-200 pt-6 sm:mt-14">
          <p className="text-center text-xs text-stone-500">
            © {new Date().getFullYear()} BaristaBar. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
