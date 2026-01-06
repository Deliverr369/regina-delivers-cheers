import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import freeDeliveryBanner from "@/assets/promo-banner.png";

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
    <section className="py-4 md:py-6">
      <div className="container mx-auto px-4">
        <Link to={banner.button_link || "/stores"} className="block">
          <img 
            src={freeDeliveryBanner} 
            alt={banner.title}
            className="w-full h-auto object-contain max-h-[200px] md:max-h-[280px]"
          />
        </Link>
      </div>
    </section>
  );
};

export default PromoBanner;
