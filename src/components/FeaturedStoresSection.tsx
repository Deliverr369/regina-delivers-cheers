import { Link } from "react-router-dom";
import { MapPin, Star, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const stores = [
  {
    id: "1",
    name: "Regina Liquor World",
    address: "2341 Victoria Ave E, Regina",
    rating: 4.8,
    reviews: 234,
    deliveryTime: "25-35 min",
    isOpen: true,
    image: "https://images.unsplash.com/photo-1597290282695-edc43d0e7129?w=500&auto=format",
  },
  {
    id: "2",
    name: "Warehouse Spirits",
    address: "1955 11th Ave, Regina",
    rating: 4.6,
    reviews: 189,
    deliveryTime: "30-40 min",
    isOpen: true,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&auto=format",
  },
  {
    id: "3",
    name: "Crown & Cork",
    address: "4501 Gordon Rd, Regina",
    rating: 4.9,
    reviews: 312,
    deliveryTime: "35-45 min",
    isOpen: true,
    image: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=500&auto=format",
  },
];

const FeaturedStoresSection = () => {
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
          {stores.map((store, index) => (
            <Link
              key={store.id}
              to={`/stores/${store.id}`}
              className="group bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-border animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Image */}
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={store.image}
                  alt={store.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {store.isOpen && (
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
                      <span className="font-medium text-foreground">{store.rating}</span>
                    </div>
                    <span className="text-muted-foreground text-sm">({store.reviews})</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">{store.deliveryTime}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedStoresSection;