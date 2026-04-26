import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import PromoBanner from "@/components/PromoBanner";
import CategoriesSection from "@/components/CategoriesSection";
import FeaturedStoresSection from "@/components/FeaturedStoresSection";
import WhyChooseUsSection from "@/components/WhyChooseUsSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    return <Navigate to="/stores" replace />;
  }

  return (
    <div className="min-h-screen">
      <SEO
        title="Liquor & Smoke Delivery in Regina | Deliverr"
        description="Order beer, wine, spirits and smokes from Regina's top stores. Fast delivery in under 60 minutes at store prices. 19+ only."
        canonical="https://regina-delivers-cheers.lovable.app/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Deliverr",
          url: "https://regina-delivers-cheers.lovable.app/",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://regina-delivers-cheers.lovable.app/products?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <Header />
      <main>
        <HeroSection />
        <PromoBanner />
        <CategoriesSection />
        <FeaturedStoresSection />
        <WhyChooseUsSection />
        <HowItWorksSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
