import { Link } from "react-router-dom";
import { Heart, Loader2, ArrowRight, ShoppingCart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { useCart } from "@/hooks/useCart";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FavoriteButton from "@/components/FavoriteButton";
import { useIsNative } from "@/hooks/useIsNative";

const Favorites = () => {
  const { user, loading: authLoading } = useAuth();
  const { favoriteIds, loading: favLoading } = useFavorites();
  const { addToCart } = useCart();
  const isNative = useIsNative();

  const productIds = Array.from(favoriteIds);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["favorite-products", productIds.sort().join(",")],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, image_url, size, store_id, in_stock, is_hidden, stores(name)")
        .in("id", productIds);
      if (error) throw error;
      return (data ?? []).filter((p) => !p.is_hidden);
    },
    enabled: !!user && !favLoading,
  });

  const handleAdd = (p: any) => {
    if (p.in_stock === false) {
      toast.error("Out of stock");
      return;
    }
    haptics.light();
    addToCart({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      image: p.image_url ?? "",
      storeId: p.store_id,
      storeName: p.stores?.name ?? "Store",
    });
    toast.success("Added to cart");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-header pb-16">
          <div className="container mx-auto px-4 text-center py-20">
            <h1 className="font-display text-2xl font-bold mb-2">Please log in</h1>
            <p className="text-muted-foreground mb-6">Sign in to view your saved favourites.</p>
            <Link to="/login"><Button className="rounded-full">Log In</Button></Link>
          </div>
        </main>
        {!isNative && <Footer />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-header pb-16">
        <div className={isNative ? "bg-primary text-primary-foreground" : "bg-secondary/50 border-b border-border"}>
          <div className={isNative ? "px-4 pt-4 pb-4" : "container mx-auto px-4 py-8"}>
            <h1 className={`font-display font-bold ${isNative ? "text-[20px] text-primary-foreground" : "text-3xl text-foreground"} mb-1 flex items-center gap-2`}>
              <Heart className="h-5 w-5 fill-current" /> Favourites
            </h1>
            <p className={isNative ? "text-[12.5px] text-primary-foreground/85" : "text-muted-foreground text-sm"}>
              {products.length} saved item{products.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 max-w-5xl">
          {isLoading || favLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground mb-1.5">No favourites yet</h2>
              <p className="text-muted-foreground text-sm mb-6 px-6">
                Tap the heart on any product to save it here for one-tap reordering.
              </p>
              <Link to="/stores">
                <Button className="gap-2 rounded-full">
                  Browse stores <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {products.map((p: any) => (
                <div key={p.id} className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col">
                  <div className="relative aspect-square bg-muted">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                        <ShoppingCart className="h-8 w-8" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <FavoriteButton productId={p.id} />
                    </div>
                    {p.size && (
                      <span className="absolute top-2 left-2 bg-background/85 backdrop-blur-md text-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        {p.size}
                      </span>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <h3 className="font-medium text-sm leading-tight line-clamp-2 mb-1">{p.name}</h3>
                    <p className="text-xs text-muted-foreground truncate mb-2">{p.stores?.name}</p>
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <span className="font-bold text-primary text-sm">${Number(p.price).toFixed(2)}</span>
                      <Button
                        size="sm"
                        className="h-8 rounded-full px-3 text-xs"
                        onClick={() => handleAdd(p)}
                        disabled={p.in_stock === false}
                      >
                        {p.in_stock === false ? "Out" : "Add"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      {!isNative && <Footer />}
    </div>
  );
};

export default Favorites;
