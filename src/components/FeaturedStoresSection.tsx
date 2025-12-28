import { Link } from "react-router-dom";
import { MapPin, Star, Clock, ArrowRight } from "lucide-react";
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
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
          <div>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
              Popular Stores Near You
            </h2>
            <p className="text-muted-foreground text-lg">
              Order from Regina's top-rated liquor stores
            </p>
          </div>
          <Link to="/stores">
            <Button variant="outline" className="gap-2">
              View All Stores
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-card rounded-2xl overflow-hidden shadow-md border border-border">
                <Skeleton className="aspect-video w-full" />
                <div className="p-6 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))
          ) : stores && stores.length > 0 ? (
            stores.map((store, index) => (
              <Link
                key={store.id}
                to={`/stores/${store.id}`}
                className="group bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-border animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Image */}
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={store.image_url || "https://images.unsplash.com/photo-1597290282695-edc43d0e7129?w=500&auto=format"}
                    alt={store.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {store.is_open && (
                    <Badge className="absolute top-4 left-4 bg-success text-white">
                      Open Now
                    </Badge>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="font-display text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {store.name}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-muted-foreground mb-3">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{store.address}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-gold text-gold" />
                        <span className="font-medium text-foreground">{store.rating || 0}</span>
                      </div>
                      <span className="text-muted-foreground text-sm">({store.reviews_count || 0})</span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
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
