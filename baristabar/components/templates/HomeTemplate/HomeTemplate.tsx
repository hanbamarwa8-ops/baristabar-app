import { Navbar } from "@/components/organisms/Navbar/Navbar";
import { HeroSection } from "@/components/organisms/HeroSection/HeroSection";
import { DiscoverySection } from "@/components/organisms/DiscoverySection/DiscoverySection";
import { FeaturedProductsSection } from "@/components/organisms/FeaturedProductsSection";
import { Footer } from "@/components/organisms/Footer/Footer";
import { CoffeeMatchSection } from "@/components/organisms/CoffeeMatchSection/CoffeeMatchSection";
import { BeanBoxSection } from "@/components/organisms/BeanBoxSection/BeanBoxSection";
export function HomeTemplate() {
  return (
    <>
      <Navbar />

      <main>
        <HeroSection />
        <DiscoverySection />
        <FeaturedProductsSection />
        <CoffeeMatchSection />
        <BeanBoxSection />
        
      </main>

      <Footer />
    </>
  );
}