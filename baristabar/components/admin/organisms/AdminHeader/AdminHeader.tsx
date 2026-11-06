"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, User } from "lucide-react";

const navigationItems = [
  {
    label: "Dashboard",
    href: "/admin",
  },
  {
    label: "Produits",
    href: "/admin/products",
  },
  {
    label: "Catégories",
    href: "/admin/categories",
  },
  {
    label: "Commandes",
    href: "/admin/orders",
  },
];

export function AdminHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-background px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            <h1 className="whitespace-nowrap text-lg font-semibold">
              BaristaBar Admin
            </h1>
            <p className="text-xs text-muted-foreground">
              Administration de la boutique
            </p>
          </div>

          <nav
            aria-label="Navigation administrateur"
            className="flex flex-wrap items-center gap-1"
          >
            {navigationItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" &&
                  pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex min-h-9 items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div
          className="flex items-center gap-2"
          aria-label="Espace administrateur"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground"
          >
            <Bell className="h-5 w-5" />
          </span>

          <span
            aria-hidden="true"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground"
          >
            <User className="h-5 w-5" />
          </span>
        </div>
      </div>
    </header>
  );
}
