import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import PromoBanner from "@/components/PromoBanner";
import CategoriesSection from "@/components/CategoriesSection";
import FeaturedStoresSection from "@/components/FeaturedStoresSection";
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
      <Header />
      <main>
        <HeroSection />
        <PromoBanner />
        <CategoriesSection />
        <FeaturedStoresSection />
        <HowItWorksSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;