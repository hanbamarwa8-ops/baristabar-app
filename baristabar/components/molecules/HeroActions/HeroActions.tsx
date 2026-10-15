import Link from "next/link";

export function HeroActions() {
  return (
    <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
      <Link
        href="/shop"
        className="group inline-flex min-h-14 items-center justify-center gap-3
          rounded-md bg-[#F8F2EB] px-8
          text-xs font-semibold uppercase tracking-[0.16em] text-[#382319]
          transition-all duration-300 hover:-translate-y-0.5 hover:bg-white
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-[#F8F2EB]"
      >
        Shop Coffee
        <span className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </Link>

      <Link
        href="/discovery"
        className="group inline-flex min-h-14 items-center justify-center gap-3
          rounded-md border border-white/40 bg-white/[0.03]
          px-7 text-xs font-semibold uppercase tracking-[0.13em]
          text-[#F8F2EB] backdrop-blur-sm
          transition-all duration-300 hover:-translate-y-0.5
          hover:border-white hover:bg-white/10
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-white"
      >
        Discover Your Coffee
        <span className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </Link>
    </div>
  );
}