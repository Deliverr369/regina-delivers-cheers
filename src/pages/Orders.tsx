import { Link } from "react-router-dom";
import { Package, Clock, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-blue-500",
  preparing: "bg-orange-500",
  out_for_delivery: "bg-purple-500",
  delivered: "bg-success",
  cancelled: "bg-destructive",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const Orders = () => {
  const { user, loading: authLoading } = useAuth();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          stores (name),
          order_items (*)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

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
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="font-display text-2xl font-bold mb-4">Please log in to view your orders</h1>
            <Link to="/login">
              <Button>Log In</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <h1 className="font-display text-3xl font-bold text-foreground mb-8">
            My Orders
          </h1>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">No orders yet</h2>
              <p className="text-muted-foreground mb-6">Start ordering from your favorite stores!</p>
              <Link to="/stores">
                <Button>Browse Stores</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-card rounded-xl border border-border p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-display text-lg font-bold text-foreground">
                          Order #{order.id.slice(0, 8).toUpperCase()}
                        </h3>
                        <Badge className={`${statusColors[order.status || "pending"]} text-white`}>
                          {statusLabels[order.status || "pending"]}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(order.created_at).toLocaleDateString("en-CA", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {order.stores && (
                          <span className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            {order.stores.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {order.delivery_address}, {order.delivery_city}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        ${Number(order.total).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.order_items?.length || 0} items
                      </p>
                    </div>
                  </div>

                  {order.order_items && order.order_items.length > 0 && (
                    <div className="border-t border-border pt-4">
                      <div className="flex flex-wrap gap-2">
                        {order.order_items.slice(0, 5).map((item: any) => (
                          <Badge key={item.id} variant="secondary">
                            {item.quantity}x {item.product_name}
                          </Badge>
                        ))}
                        {order.order_items.length > 5 && (
                          <Badge variant="outline">
                            +{order.order_items.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Orders;