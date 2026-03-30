import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight } from "lucide-react";

interface PromoBannerData {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  button_text: string | null;
  button_link: string | null;
  is_active: boolean | null;
  display_order: number | null;
}

const PromoBanner = () => {
  const { data: banner, isLoading } = useQuery({
    queryKey: ["promo-banner"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_banners")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .limit(1)
        .single();

      if (error) return null;
      return data as PromoBannerData;
    },
  });

  if (isLoading || !banner) return null;

  return (
    <section className="py-4 md:py-6">
      <div className="container mx-auto px-4">
        <div className="bg-gradient-to-r from-primary/8 via-primary/4 to-primary/8 rounded-2xl p-6 md:p-8 text-center border border-primary/15">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-1">
            {banner.title}
          </h2>
          {banner.subtitle && (
            <h3 className="text-lg md:text-xl font-display font-semibold text-primary mb-1">
              {banner.subtitle}
            </h3>
          )}
          {banner.description && (
            <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto mt-1">
              {banner.description}
            </p>
          )}
          {banner.button_text && banner.button_link && (
            <Link to={banner.button_link}>
              <Button size="lg" className="mt-5 px-8 rounded-full font-semibold gap-2">
                {banner.button_text}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
};

export default PromoBanner;
