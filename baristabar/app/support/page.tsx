import { Navbar } from "@/components/organisms/Navbar/Navbar";
import { Footer } from "@/components/organisms/Footer";
import { SupportChat } from "./SupportChat";

export const dynamic = "force-dynamic";

export default function CustomerSupportPage() {
  return (
    <main className="min-h-screen bg-[#FBF8F4] text-[#3B2418]">
      <Navbar />
      <section className="mx-auto w-full max-w-310 px-4 pb-16 pt-8 sm:px-8 sm:pt-12 lg:px-12">
        <div className="mb-8 max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A6B55]">
            <span>BARISTABAR</span><span className="h-1 w-1 rounded-full bg-[#BDAA99]" /><span>PERSONAL SUPPORT</span>
          </div>
          <h1 className="text-4xl font-medium tracking-tight text-[#3B2418] sm:text-5xl" style={{ fontFamily: "var(--font-brand)" }}>
            How can we help?
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#795A46] sm:text-base">
            Send a private message to the BaristaBar team. Your conversation stays linked to your customer account.
          </p>
        </div>
        <SupportChat />
      </section>
      <Footer />
    </main>
  );
}
