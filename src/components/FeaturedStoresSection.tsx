import { Link } from "react-router-dom";
import { MapPin, Star, Clock, ArrowRight, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const FeaturedStoresSection = () => {
  const { data: stores, isLoading } = useQuery({
    queryKey: ['featured-stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('rating', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <section className="section-padding bg-[hsl(var(--soft-grey))]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              Popular Stores
            </h2>
            <p className="text-muted-foreground text-sm md:text-base">
              Order from Regina's top-rated liquor stores
            </p>
          </div>
          <Link to="/stores">
            <Button variant="outline" className="gap-2 rounded-full border-primary/40 text-[hsl(var(--primary-strong))] hover:bg-primary/10 hover:text-[hsl(var(--primary-strong))]">
              View All Stores
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl overflow-hidden border border-border">
                <Skeleton className="h-44 w-full" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))
          ) : stores && stores.length > 0 ? (
            stores.map((store) => (
              <Link
                key={store.id}
                to={`/stores/${store.id}`}
                className="group bg-card rounded-2xl overflow-hidden border border-border card-hover"
              >
                {/* Image/Logo */}
                <div className="relative h-44 overflow-hidden bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center p-6">
                  <img
                    src={store.image_url || "https://images.unsplash.com/photo-1597290282695-edc43d0e7129?w=500&auto=format"}
                    alt={store.name}
                    className={`max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500 ${
                      store.image_url?.includes('.png') ? 'drop-shadow-lg' : 'w-full h-full object-cover rounded-lg'
                    }`}
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    {store.is_open ? (
                      <Badge className="bg-success text-white text-xs font-medium shadow-sm">Open Now</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs font-medium">Closed</Badge>
                    )}
                  </div>
                  {Number(store.delivery_fee) === 0 && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-primary text-primary-foreground text-xs font-medium shadow-sm">
                        <Truck className="h-3 w-3 mr-1" />
                        Free Delivery
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-display text-lg font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors">
                    {store.name}
                  </h3>
                  
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-3">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="text-sm">{store.address}</span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <Star className="h-4 w-4 fill-gold text-gold" />
                      <span className="font-semibold text-foreground text-sm">{store.rating || 0}</span>
                      <span className="text-muted-foreground text-xs">({store.reviews_count || 0})</span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-sm">{store.delivery_time || "30-45 min"}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-muted-foreground col-span-3 text-center py-8">
              No stores available at the moment.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default FeaturedStoresSection;
