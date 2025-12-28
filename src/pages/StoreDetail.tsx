import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, Star, Clock, Phone, ArrowLeft, Plus, Minus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const storeData = {
  id: "1",
  name: "Regina Liquor World",
  address: "2341 Victoria Ave E, Regina, SK",
  phone: "(306) 555-0123",
  rating: 4.8,
  reviews: 234,
  deliveryTime: "25-35 min",
  deliveryFee: "Free",
  isOpen: true,
  hours: "10:00 AM - 10:00 PM",
  image: "https://images.unsplash.com/photo-1597290282695-edc43d0e7129?w=800&auto=format",
};

const products = {
  beer: [
    { id: "b1", name: "Budweiser 24 Pack", price: 42.99, image: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=300&auto=format" },
    { id: "b2", name: "Kokanee 15 Pack", price: 28.99, image: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=300&auto=format" },
    { id: "b3", name: "Corona Extra 12 Pack", price: 24.99, image: "https://images.unsplash.com/photo-1600857062241-98e5dba7f214?w=300&auto=format" },
    { id: "b4", name: "Heineken 12 Pack", price: 26.99, image: "https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?w=300&auto=format" },
  ],
  wine: [
    { id: "w1", name: "Barefoot Cabernet Sauvignon", price: 12.99, image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format" },
    { id: "w2", name: "Yellow Tail Chardonnay", price: 11.99, image: "https://images.unsplash.com/photo-1474722883778-792e7990302f?w=300&auto=format" },
    { id: "w3", name: "Apothic Red Blend", price: 14.99, image: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=300&auto=format" },
  ],
  spirits: [
    { id: "s1", name: "Smirnoff Vodka 750ml", price: 24.99, image: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format" },
    { id: "s2", name: "Jack Daniel's 750ml", price: 34.99, image: "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format" },
    { id: "s3", name: "Captain Morgan Spiced Rum 750ml", price: 28.99, image: "https://images.unsplash.com/photo-1609951651556-5334e2706168?w=300&auto=format" },
  ],
  smokes: [
    { id: "sm1", name: "Marlboro Red King Size", price: 18.99, image: "https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?w=300&auto=format" },
    { id: "sm2", name: "Canadian Classic Blue", price: 16.99, image: "https://images.unsplash.com/photo-1551524164-687a55dd1126?w=300&auto=format" },
  ],
};

const StoreDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const getQuantity = (productId: string) => quantities[productId] || 0;

  const updateQuantity = (productId: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) + delta),
    }));
  };

  const handleAddToCart = (product: { id: string; name: string; price: number; image: string }) => {
    const qty = getQuantity(product.id);
    if (qty === 0) {
      updateQuantity(product.id, 1);
    }
    addToCart({
      ...product,
      storeId: storeData.id,
      storeName: storeData.name,
    });
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart`,
    });
  };

  const ProductCard = ({ product }: { product: { id: string; name: string; price: number; image: string } }) => (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square overflow-hidden">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
      </div>
      <div className="p-4">
        <h4 className="font-medium text-foreground mb-1 line-clamp-2">{product.name}</h4>
        <p className="text-xl font-bold text-primary mb-4">${product.price.toFixed(2)}</p>
        
        <div className="flex items-center gap-2">
          {getQuantity(product.id) > 0 ? (
            <div className="flex items-center gap-2 flex-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => updateQuantity(product.id, -1)}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="font-medium w-8 text-center">{getQuantity(product.id)}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => updateQuantity(product.id, 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button className="flex-1" onClick={() => handleAddToCart(product)}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        {/* Store Header */}
        <div className="relative h-64 md:h-80">
          <img
            src={storeData.image}
            alt={storeData.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="container mx-auto">
              <Link to="/stores" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to stores
              </Link>
              
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
                      {storeData.name}
                    </h1>
                    {storeData.isOpen && (
                      <Badge className="bg-success text-white">Open</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-white/80">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {storeData.address}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {storeData.hours}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-white">
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-gold text-gold" />
                    <span className="font-bold">{storeData.rating}</span>
                    <span className="text-white/70">({storeData.reviews})</span>
                  </div>
                  <div className="text-white/70">
                    {storeData.deliveryTime} • {storeData.deliveryFee} delivery
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="container mx-auto px-4 py-8">
          <Tabs defaultValue="beer" className="w-full">
            <TabsList className="mb-8 w-full justify-start overflow-x-auto">
              <TabsTrigger value="beer">Beer ({products.beer.length})</TabsTrigger>
              <TabsTrigger value="wine">Wine ({products.wine.length})</TabsTrigger>
              <TabsTrigger value="spirits">Spirits ({products.spirits.length})</TabsTrigger>
              <TabsTrigger value="smokes">Smokes ({products.smokes.length})</TabsTrigger>
            </TabsList>

            {Object.entries(products).map(([category, items]) => (
              <TabsContent key={category} value={category}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {items.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StoreDetail;