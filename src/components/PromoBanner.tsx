import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Sparkles } from "lucide-react";

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
    <section className="py-6 md:py-10">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-8 md:p-12 text-center shadow-xl shadow-primary/20">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-56 h-56 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
          <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-white/5 rounded-full" />

          <div className="relative z-10">
            {/* Icon badge */}
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm mb-5">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-primary-foreground mb-2 tracking-tight">
              {banner.title}
            </h2>
            {banner.subtitle && (
              <h3 className="text-xl md:text-2xl font-display font-semibold text-primary-foreground/90 mb-3">
                {banner.subtitle}
              </h3>
            )}
            {banner.description && (
              <p className="text-primary-foreground/70 text-base md:text-lg max-w-lg mx-auto mt-2 leading-relaxed">
                {banner.description}
              </p>
            )}
            {banner.button_text && banner.button_link && (
              <Link to={banner.button_link}>
                <Button
                  size="lg"
                  variant="secondary"
                  className="mt-6 px-10 rounded-full font-bold gap-2 text-base shadow-lg hover:shadow-xl transition-all hover:scale-105 bg-white text-primary hover:bg-white/90"
                >
                  {banner.button_text}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromoBanner;
