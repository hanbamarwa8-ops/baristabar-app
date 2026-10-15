export function NewsletterSection() {
    return (
      <section className="bg-[#EDE5DA] px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto flex max-w-310 flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6B55]">
              Stay in the loop
            </p>
  
            <h2 className="mt-3 font-serif text-3xl text-[#3B2418] sm:text-4xl">
              Good coffee, delivered to your inbox.
            </h2>
  
            <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
              Discover new coffees, brewing tips and the latest from BaristaBar.
            </p>
          </div>
  
          <a
            href="mailto:hello@baristabar.com"
            className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-[#3B2418] px-6 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#563725]"
          >
            Get in touch →
          </a>
        </div>
      </section>
    );
  }