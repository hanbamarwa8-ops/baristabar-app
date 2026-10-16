"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Logo } from "@/components/atoms/Logo";
import { Icon } from "@/components/atoms/Icon";
import { NavItem } from "@/components/molecules/NavItem";
import { useCart } from "@/components/providers/CartProvider";

const categories = [
  { label: "Coffee Beans", slug: "coffee-beans" },
  { label: "Ground Coffee", slug: "ground-coffee" },
  { label: "Coffee Capsules", slug: "coffee-capsules" },
  { label: "Syrups & Flavours", slug: "syrups-flavours" },
  { label: "Accessories", slug: "accessories" },
  { label: "Coffee Machines", slug: "coffee-machines" },
  { label: "Gift Boxes", slug: "gift-boxes" },
];

const navigationLinkClass =
  "text-sm font-medium text-[#3B2418] transition-colors duration-200 hover:text-[#8A6B55]";

export function Navbar() {
  const { itemCount } = useCart();

  const [shopOpen, setShopOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileShopOpen, setMobileShopOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  function toggleSearch() {
    if (searchOpen) {
      setSearchQuery("");
      setSearchOpen(false);
    } else {
      setSearchOpen(true);
    }
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
    setMobileShopOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#3B2418]/10 bg-[#E8DED4]/80 text-[#3B2418] backdrop-blur-xl">
      <div className="relative mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-3 px-4 sm:gap-4 sm:px-8 lg:px-12">

        {/* Logo */}
        <div
          className={`shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
            searchOpen
              ? "max-md:max-w-0 max-md:opacity-0"
              : "max-w-[220px] opacity-100"
          }`}
        >
          <Logo />
        </div>

        {/* Desktop navigation */}
        <nav
          aria-label="Main navigation"
          className={`absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 transition-opacity duration-200 lg:gap-8 md:flex ${
            searchOpen
              ? "pointer-events-none opacity-0"
              : "opacity-100"
          }`}
        >
          <NavItem href="/" label="Home" />

          {/* Shop dropdown */}
          <div className="relative flex items-center gap-1">
            <Link href="/shop" className={navigationLinkClass}>
              Shop
            </Link>

            <button
              type="button"
              onClick={() => setShopOpen((open) => !open)}
              aria-label="Toggle shop categories"
              aria-expanded={shopOpen}
              className="flex h-8 w-7 items-center justify-center rounded-full transition-colors hover:bg-[#3B2418]/5"
            >
              <svg
                viewBox="0 0 20 20"
                width="15"
                height="15"
                fill="none"
                aria-hidden="true"
                className={`transition-transform duration-200 ${
                  shopOpen ? "rotate-180" : ""
                }`}
              >
                <path
                  d="m5 7.5 5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {shopOpen && !searchOpen && (
              <div className="absolute left-1/2 top-full z-50 mt-5 w-64 -translate-x-1/2 rounded-xl border border-[#3B2418]/10 bg-[#F8F5F0]/95 p-3 shadow-lg shadow-[#3B2418]/10 backdrop-blur-xl">
                <Link
                  href="/shop"
                  onClick={() => setShopOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm font-semibold text-[#3B2418] transition-colors hover:bg-[#E8DED4]"
                >
                  All products
                </Link>

                <div className="my-1 border-t border-[#3B2418]/10" />

                {categories.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/shop?category=${category.slug}`}
                    onClick={() => setShopOpen(false)}
                    className="block rounded-lg px-4 py-2.5 text-sm text-[#665044] transition-colors hover:bg-[#E8DED4] hover:text-[#3B2418]"
                  >
                    {category.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <NavItem href="/#discovery" label="Discovery" />
          <NavItem href="/beanbox" label="BeanBox" />
        </nav>

        {/* Right-side actions */}
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">

          {/* Animated search field, inside the navbar */}
          <div
            aria-hidden={!searchOpen}
            className={`shrink-0 overflow-hidden transition-[width,opacity] duration-300 ease-in-out ${
              searchOpen
                ? "w-[130px] opacity-100 sm:w-[180px] lg:w-[220px]"
                : "w-0 opacity-0"
            }`}
          >
            <form
              action="/shop"
              method="get"
              role="search"
              className="flex h-10 w-full items-center gap-2 rounded-full border border-[#3B2418]/15 bg-[#F8F5F0]/65 px-3 shadow-sm shadow-[#3B2418]/[0.03] backdrop-blur-lg transition-colors duration-300 focus-within:border-[#8A6B55]/60"
            >
              <input
                ref={searchInputRef}
                type="search"
                name="q"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                disabled={!searchOpen}
                placeholder="Search..."
                aria-label="Search products"
                className="min-w-0 flex-1 bg-transparent text-sm text-[#3B2418] outline-none placeholder:text-[#9A8577]"
              />

              <button
                type="submit"
                disabled={!searchOpen || !searchQuery.trim()}
                aria-label="Submit search"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#3B2418] transition-colors hover:bg-[#3B2418]/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icon name="search" size={15} />
              </button>
            </form>
          </div>

          {/* Search toggle */}
          <button
            type="button"
            onClick={toggleSearch}
            aria-label={searchOpen ? "Close search" : "Open search"}
            aria-expanded={searchOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-200 hover:bg-[#3B2418]/5"
          >
            {searchOpen ? (
              <svg
                viewBox="0 0 24 24"
                width="19"
                height="19"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="m6 6 12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <Icon name="search" size={18} />
            )}
          </button>

          {/* Cart */}
          <Link
            href="/cart"
            aria-label={`Cart, ${itemCount} items`}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-200 hover:bg-[#3B2418]/5"
          >
            <Icon name="cart" size={18} />

            {itemCount > 0 && (
              <span className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#3B2418] px-1 text-[10px] font-semibold text-white">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>

          {/* Desktop authentication links */}
          <div
            className={`ml-2 hidden items-center gap-4 lg:flex ${
              searchOpen ? "lg:hidden" : ""
            }`}
          >
            <Link
              href="/sign-in"
              className="text-xs font-semibold uppercase tracking-[0.08em] text-[#3B2418] transition-colors hover:text-[#8A6B55]"
            >
              Sign in
            </Link>

            <Link
              href="/sign-up"
              className="rounded-full border border-[#3B2418] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#3B2418] transition-colors hover:bg-[#3B2418] hover:text-white"
            >
              Sign up
            </Link>
          </div>

          {/* Responsive hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={
              mobileMenuOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            aria-expanded={mobileMenuOpen}
            className="ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[#3B2418]/5 md:hidden"
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

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-[#3B2418]/10 bg-[#E8DED4]/95 px-5 py-5 backdrop-blur-xl md:hidden"
        >
          <div className="flex flex-col gap-1">
            <Link
              href="/"
              onClick={closeMobileMenu}
              className="rounded-lg px-3 py-3 text-sm font-medium text-[#3B2418] transition-colors hover:bg-[#3B2418]/5"
            >
              Home
            </Link>

            {/* Mobile Shop dropdown */}
            <button
              type="button"
              onClick={() => setMobileShopOpen((open) => !open)}
              aria-expanded={mobileShopOpen}
              className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-sm font-medium text-[#3B2418] transition-colors hover:bg-[#3B2418]/5"
            >
              Shop

              <svg
                viewBox="0 0 20 20"
                width="16"
                height="16"
                fill="none"
                aria-hidden="true"
                className={`transition-transform ${
                  mobileShopOpen ? "rotate-180" : ""
                }`}
              >
                <path
                  d="m5 7.5 5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {mobileShopOpen && (
              <div className="ml-3 border-l border-[#3B2418]/15 py-1 pl-3">
                <Link
                  href="/shop"
                  onClick={closeMobileMenu}
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-[#3B2418] hover:bg-[#3B2418]/5"
                >
                  All products
                </Link>

                {categories.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/shop?category=${category.slug}`}
                    onClick={closeMobileMenu}
                    className="block rounded-lg px-3 py-2.5 text-sm text-[#665044] transition-colors hover:bg-[#3B2418]/5"
                  >
                    {category.label}
                  </Link>
                ))}
              </div>
            )}

            <Link
              href="/#discovery"
              onClick={closeMobileMenu}
              className="rounded-lg px-3 py-3 text-sm font-medium text-[#3B2418] hover:bg-[#3B2418]/5"
            >
              Discovery
            </Link>

            <Link
              href="/beanbox"
              onClick={closeMobileMenu}
              className="rounded-lg px-3 py-3 text-sm font-medium text-[#3B2418] hover:bg-[#3B2418]/5"
            >
              BeanBox
            </Link>

            <div className="my-2 border-t border-[#3B2418]/15" />

            <Link
              href="/cart"
              onClick={closeMobileMenu}
              className="rounded-lg px-3 py-3 text-sm font-medium text-[#3B2418] hover:bg-[#3B2418]/5"
            >
              Cart {itemCount > 0 && `(${itemCount})`}
            </Link>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link
                href="/sign-in"
                onClick={closeMobileMenu}
                className="rounded-full border border-[#3B2418]/50 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[#3B2418] hover:bg-[#3B2418]/5"
              >
                Sign in
              </Link>

              <Link
                href="/sign-up"
                onClick={closeMobileMenu}
                className="rounded-full bg-[#3B2418] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#684733]"
              >
                Sign up
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}