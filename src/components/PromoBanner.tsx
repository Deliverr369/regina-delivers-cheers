import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface PromoBanner {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  button_text: string | null;
  button_link: string | null;
}

const PromoBanner = () => {
  const [banner, setBanner] = useState<PromoBanner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanner = async () => {
      const { data, error } = await supabase
        .from("promo_banners")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .limit(1)
        .single();

      if (!error && data) {
        setBanner(data);
      }
      setLoading(false);
    };

    fetchBanner();
  }, []);

  if (loading || !banner) return null;

  return (
    <section className="bg-gradient-to-r from-gray-50 to-gray-100 py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">
          {/* Left side product images */}
          <div className="hidden md:flex items-end gap-2">
            <div className="w-20 h-28 bg-gradient-to-b from-blue-600 to-blue-800 rounded-lg shadow-lg transform -rotate-6"></div>
            <div className="w-20 h-32 bg-gradient-to-b from-red-500 to-red-700 rounded-lg shadow-lg"></div>
            <div className="w-20 h-30 bg-gradient-to-b from-blue-400 to-blue-600 rounded-lg shadow-lg transform rotate-3"></div>
          </div>

          {/* Center content */}
          <div className="text-center flex flex-col items-center gap-4">
            <h2 className="text-4xl md:text-5xl font-display font-bold italic text-primary">
              {banner.title}
            </h2>
            {banner.subtitle && (
              <h3 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                {banner.subtitle}
              </h3>
            )}
            {banner.description && (
              <p className="text-muted-foreground text-lg max-w-md">
                {banner.description}
              </p>
            )}
            {banner.button_text && banner.button_link && (
              <Link to={banner.button_link}>
                <Button 
                  size="lg" 
                  className="mt-2 bg-foreground text-background hover:bg-foreground/90 rounded-none px-8 py-6 text-lg font-bold"
                >
                  {banner.button_text}
                </Button>
              </Link>
            )}
          </div>

          {/* Right side product images */}
          <div className="hidden md:flex items-end gap-2">
            <div className="w-16 h-24 bg-gradient-to-b from-amber-100 to-amber-300 rounded-lg shadow-lg transform -rotate-3"></div>
            <div className="w-20 h-32 bg-gradient-to-b from-pink-400 to-pink-600 rounded-lg shadow-lg"></div>
            <div className="w-20 h-30 bg-gradient-to-b from-purple-500 to-purple-700 rounded-lg shadow-lg transform rotate-6"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromoBanner;
