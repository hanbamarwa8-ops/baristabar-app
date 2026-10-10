import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      className="text-xl font-semibold tracking-[0.2em] text-foreground"
    >
      BARISTABAR
    </Link>
  );
}