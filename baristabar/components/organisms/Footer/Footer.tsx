import Link from "next/link";
import { Logo } from "@/components/atoms/Logo";

const footerLinks = [
  { href: "/shop", label: "Shop" },
  { href: "/discovery", label: "Discovery" },
  { href: "/recipes", label: "Recipes" },
  { href: "/beanbox", label: "BeanBox" },
];

export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-white px-6 py-10 sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-310 flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="text-sm text-stone-500">
            Good coffee. Better moments.
          </p>
        </div>

        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap gap-x-6 gap-y-3"
        >
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-stone-600 transition-colors hover:text-[#3B2418]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="text-xs text-stone-500">
          © {new Date().getFullYear()} BaristaBar
        </p>
      </div>
    </footer>
  );
}