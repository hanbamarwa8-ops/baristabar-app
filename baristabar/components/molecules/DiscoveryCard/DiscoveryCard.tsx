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
    <article className="group relative isolate min-h-105 overflow-hidden rounded-xl bg-[#2A1913] sm:min-h-120">
      <Image
        src={image}
        alt={imageAlt}
        fill
        sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-t from-[#1C100C]/95 via-[#1C100C]/25 to-transparent"
      />

      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#E4C5A9]">
          {number} / Discover
        </p>

        <h3 className="mt-4 font-serif text-3xl text-[#F8F2EB] sm:text-4xl">
          {title}
        </h3>

        <p className="mt-3 max-w-sm text-sm leading-6 text-white/80">
          {description}
        </p>

        <Link
          href={href}
          className="mt-6 inline-flex items-center gap-3 border-b border-white/50 pb-2 text-xs font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:border-white hover:text-[#E4C5A9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Explore more
          <span
            aria-hidden="true"
            className="transition-transform duration-300 group-hover:translate-x-1"
          >
            →
          </span>
        </Link>
      </div>
    </article>
  );
}
