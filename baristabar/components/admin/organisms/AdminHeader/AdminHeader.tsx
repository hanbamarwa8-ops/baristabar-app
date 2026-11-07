
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

import { Logo } from "@/components/atoms/Logo";

const navigationItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Products", href: "/admin/products" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Orders", href: "/admin/orders" },
];

export function AdminHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function isActive(href: string) {
    return (
      pathname === href ||
      (href !== "/admin" && pathname.startsWith(`${href}/`))
    );
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#3B2418]/10 bg-[#E8DED4]/80 text-[#3B2418] backdrop-blur-xl">
      <div className="relative mx-auto flex h-19 max-w-360 items-center justify-between gap-3 px-4 sm:gap-4 sm:px-8 lg:px-12">
        {/* Same brand logo as the storefront */}
        <div className="shrink-0">
          <Logo />
        </div>

        {/* Desktop navigation */}
        <nav
          aria-label="Admin navigation"
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 md:flex lg:gap-8"
        >
          {navigationItems.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-sm transition-all duration-200 ${
                  active
                    ? "bg-[#3B2418] font-semibold text-[#F8F2EB] shadow-sm shadow-[#3B2418]/15"
                    : "font-medium text-[#3B2418] hover:text-[#8A6B55]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Header action */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#3B2418] px-5 py-2 text-[11px] font-semibold uppercase tracking-widest text-[#F8F2EB] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#684733] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B2418] focus-visible:ring-offset-2 focus-visible:ring-offset-[#E8DED4]"
          >
            View shop
            <ArrowUpRight size={15} />
          </Link>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="admin-mobile-navigation"
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[#3B2418]/5 md:hidden"
          >
            {mobileMenuOpen ? (
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="m6 6 12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      {mobileMenuOpen && (
        <nav
          id="admin-mobile-navigation"
          aria-label="Admin mobile navigation"
          className="border-t border-[#3B2418]/10 bg-[#E8DED4]/95 px-5 py-4 backdrop-blur-xl md:hidden"
        >
          <div className="flex flex-col gap-1">
            {navigationItems.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-4 py-3 text-sm transition-colors ${
                    active
                      ? "bg-[#3B2418] font-semibold text-[#F8F2EB]"
                      : "font-medium text-[#3B2418] hover:bg-[#3B2418]/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="my-2 border-t border-[#3B2418]/15" />

            <Link
              href="/"
              onClick={closeMobileMenu}
              className="flex items-center justify-between rounded-full bg-[#3B2418] px-4 py-3 text-sm font-semibold text-[#F8F2EB]"
            >
              View shop
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
