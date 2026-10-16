import Link from "next/link";

interface NavItemProps {
  href: string;
  label: string;
}

export function NavItem({ href, label }: NavItemProps) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-stone-600 transition-colors hover:text-[#3B2418]"
    >
      {label}
    </Link>
  );
}