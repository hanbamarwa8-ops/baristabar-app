import { Navbar } from "@/components/organisms/Navbar/Navbar";
import { HeroSection } from "@/components/organisms/HeroSection/HeroSection";
import { DiscoverySection } from "@/components/organisms/DiscoverySection/DiscoverySection";
import { FeaturedProductsSection } from "@/components/organisms/FeaturedProductsSection";
import { Footer } from "@/components/organisms/Footer/Footer";
import { CoffeeMatchSection } from "@/components/organisms/CoffeeMatchSection/CoffeeMatchSection";
import { BeanBoxSection } from "@/components/organisms/BeanBoxSection/BeanBoxSection";
import { ShopByCategorySection } from "@/components/organisms/ShopByCategorySection/ShopByCategorySection";
export function HomeTemplate() {
  return (
    <>
      <Navbar />

      <main>
        <HeroSection />
        <DiscoverySection />
        <FeaturedProductsSection />
        <ShopByCategorySection />
        <CoffeeMatchSection />
        <BeanBoxSection />
        
      </main>

      <Footer />
    </>
  );
}