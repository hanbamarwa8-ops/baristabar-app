import Image from "next/image";
import Link from "next/link";

interface DiscoveryCardProps {
  number: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  href: string;
}

export function DiscoveryCard({
  number,
  title,
  description,
  image,
  imageAlt,
  href,
}: DiscoveryCardProps) {
  return (
    <article
      className="group relative isolate flex min-h-100
        overflow-hidden rounded-[10px] bg-[#2A1913]
        sm:min-h-4/5"
    >
      {/* Full-cover image */}
      <Image
        src={image}
        alt={imageAlt}
        fill
        sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
        className="object-cover transition-transform
          duration-700 ease-out
          motion-safe:group-hover:scale-[1.04]"
      />

      {/* Gradient for text readability */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-t
          from-[#1C100C]/95 via-[#1C100C]/35
          to-[#1C100C]/5"
      />

      {/* Card content */}
      <div className="relative z-10 mt-auto w-full p-5 sm:p-7">
        <p
          className="text-[10px] font-semibold uppercase
            tracking-[0.2em] text-[#E4C5A9] sm:text-xs"
        >
          {number} / Discover
        </p>

        <h3
          className="mt-3 font-serif text-3xl leading-tight
            text-[#F8F2EB] sm:text-4xl"
        >
          {title}
        </h3>

        <p
          className="mt-3 max-w-sm text-sm leading-6
            text-[#F8F2EB]/80"
        >
          {description}
        </p>

        <Link
          href={href}
          className="mt-5 inline-flex w-fit items-center gap-3
            border-b border-white/50 pb-2
            text-[10px] font-semibold uppercase
            tracking-[0.15em] text-white
            transition-colors hover:border-[#E4C5A9]
            hover:text-[#E4C5A9]
            focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-white
            focus-visible:ring-offset-4
            focus-visible:ring-offset-[#2A1913] sm:text-xs"
        >
          Explore more
          <span
            aria-hidden="true"
            className="transition-transform duration-300
              motion-safe:group-hover:translate-x-1"
          >
            →
          </span>
        </Link>
      </div>
    </article>
  );
}
