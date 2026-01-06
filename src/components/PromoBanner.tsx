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
    <section className="bg-white py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
          {/* Left side product images */}
          <div className="hidden md:flex items-end gap-1">
            <img 
              src="/images/products/budweiser.jpg" 
              alt="Bud Light" 
              className="w-16 h-24 object-contain transform -rotate-3"
            />
            <img 
              src="/images/products/heineken.jpg" 
              alt="Budweiser" 
              className="w-18 h-28 object-contain"
            />
            <img 
              src="/images/products/corona-extra.jpg" 
              alt="Kokanee" 
              className="w-20 h-32 object-contain transform rotate-2"
            />
          </div>

          {/* Center content */}
          <div className="text-center flex flex-col items-center gap-2">
            <h2 className="text-4xl md:text-5xl font-display font-bold italic text-primary tracking-tight">
              {banner.title}
            </h2>
            {banner.subtitle && (
              <h3 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">
                {banner.subtitle}
              </h3>
            )}
            {banner.description && (
              <p className="text-muted-foreground text-base md:text-lg max-w-sm mt-2">
                {banner.description}
              </p>
            )}
            {banner.button_text && banner.button_link && (
              <Link to={banner.button_link}>
                <Button 
                  size="lg" 
                  className="mt-4 bg-foreground text-background hover:bg-foreground/90 rounded-none px-10 py-6 text-lg font-bold uppercase tracking-wide"
                >
                  {banner.button_text}
                </Button>
              </Link>
            )}
          </div>

          {/* Right side product images */}
          <div className="hidden md:flex items-end gap-1">
            <img 
              src="/images/products/stella-artois.jpg" 
              alt="Stella Artois" 
              className="w-16 h-24 object-contain transform -rotate-2"
            />
            <img 
              src="/images/products/coors-light.jpg" 
              alt="Palm Bay" 
              className="w-18 h-28 object-contain"
            />
            <img 
              src="/images/products/pilsner-urquell.jpg" 
              alt="Mike's" 
              className="w-20 h-32 object-contain transform rotate-3"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromoBanner;
