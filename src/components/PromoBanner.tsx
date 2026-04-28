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
    <section className="pt-10 md:pt-14 pb-2">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-2xl bg-primary-gradient p-8 md:p-12 text-center shadow-[0_20px_50px_-25px_hsl(var(--primary)/0.5)]">
          {/* Subtle decorative glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-black/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            {/* Icon badge */}
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 mb-5">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>

            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-2 tracking-tight">
              {banner.title}
            </h2>
            {banner.subtitle && (
              <h3 className="font-display text-xl md:text-2xl font-semibold text-primary-foreground/90 mb-3">
                {banner.subtitle}
              </h3>
            )}
            {banner.description && (
              <p className="text-primary-foreground/80 text-base md:text-lg max-w-lg mx-auto mt-2 leading-relaxed">
                {banner.description}
              </p>
            )}
            {banner.button_text && banner.button_link && (
              <Link to={banner.button_link}>
                <Button
                  size="lg"
                  className="mt-7 px-9 rounded-full font-semibold gap-2 text-base bg-white text-primary hover:bg-white/95 hover:shadow-xl transition-all"
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
