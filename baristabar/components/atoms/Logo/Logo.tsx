import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      aria-label="BaristaBar - Accueil"
      className="inline-flex shrink-0 items-center "
    >
      {/* Coffee bean */}
      <svg
        viewBox="0 0 64 64"
        className="h-[31px] w-[31px] shrink-0"
        fill="none"
        aria-hidden="true"
      >
        <g transform="rotate(38 32 32)">
          <path
            d="M32 4 C44 5 53 17 53 31
               C53 45 44 59 32 60
               C20 59 11 45 11 31
               C11 17 20 5 32 4Z"
            fill="#3B2418"
          />
          <path
            d="M28 5 C21 17 41 24 31 35
               C23 45 30 53 34 59"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </g>
      </svg>

      {/* Brand name */}
      <span
        className="text-[29px] font-medium italic leading-none tracking-[-0.045em]"
        style={{
          color: "#3B2418",
          fontFamily: "var(--font-brand), serif",
        }}
      >
        BaristaBar
      </span>
    </Link>
  );
}
