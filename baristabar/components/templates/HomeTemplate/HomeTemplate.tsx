import { Navbar } from "@/components/organisms/Navbar/Navbar";
import { HeroSection } from "@/components/organisms/HeroSection/HeroSection";
import { DiscoverySection } from "@/components/organisms/DiscoverySection/DiscoverySection";
import { FeaturedProductsSection } from "@/components/organisms/FeaturedProductsSection";
import { NewsletterSection } from "@/components/organisms/NewsletterSection/NewsletterSection";
import { Footer } from "@/components/organisms/Footer/Footer";

export function HomeTemplate() {
  return (
    <>
      <Navbar />

      <main>
        <HeroSection />
        <DiscoverySection />
        <FeaturedProductsSection />
        <NewsletterSection />
      </main>

      <Footer />
    </>
  );
}