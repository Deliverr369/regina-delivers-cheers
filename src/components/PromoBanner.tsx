import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PromoBanner {
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
  const { data: banner, isLoading: loading } = useQuery({
    queryKey: ["promo-banner"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_banners")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .limit(1)
        .single();

      if (error) {
        console.error("Error fetching promo banner:", error);
        return null;
      }
      return data as PromoBanner;
    },
  });

  if (loading || !banner) return null;

  return (
    <section className="py-6 md:py-10">
      <div className="container mx-auto px-4">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 md:p-12 text-center border border-primary/20">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
            {banner.title}
          </h2>
          {banner.subtitle && (
            <h3 className="text-xl md:text-2xl font-display font-semibold text-primary mb-2">
              {banner.subtitle}
            </h3>
          )}
          {banner.description && (
            <p className="text-muted-foreground text-base md:text-lg max-w-md mx-auto mt-2">
              {banner.description}
            </p>
          )}
          {banner.button_text && banner.button_link && (
            <Link to={banner.button_link}>
              <Button size="lg" className="mt-6 px-10 py-6 text-lg font-bold uppercase tracking-wide">
                {banner.button_text}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
};

export default PromoBanner;
