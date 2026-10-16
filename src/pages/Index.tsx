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
import TestimonialsSection from "@/components/TestimonialsSection";
import AsSeenOnSection from "@/components/AsSeenOnSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import ReginaLiquorIntro from "@/components/ReginaLiquorIntro";
import { localBusinessJsonLd, reginaServiceJsonLd } from "@/components/seo/LocalBusinessJsonLd";
import { CONTACT } from "@/config/contact";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    return <Navigate to="/stores" replace />;
  }

  return (
    <div className="min-h-screen">
      <SEO
        title="Liquor Delivery Regina | Beer, Wine & Smokes | Deliverr"
        description="Liquor delivery in Regina from Co-op, Sobeys, Superstore & Willow Park. Beer, wine, spirits and smokes at store prices, free over $50. 19+."
        canonical={`${CONTACT.siteUrl}/`}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Deliverr",
            url: `${CONTACT.siteUrl}/`,
            potentialAction: {
              "@type": "SearchAction",
              target: `${CONTACT.siteUrl}/products?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
        ]}
      />
      <Header />
      <main>
        <HeroSection />
        <FeaturedStoresSection />
        <ReginaLiquorIntro />
        <PromoBanner />
        <CategoriesSection />
        <WhyChooseUsSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <AsSeenOnSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
