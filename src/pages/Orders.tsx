import { Link } from "react-router-dom";
import { Package, Clock, MapPin, Loader2, ShoppingBag, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PriceDisclaimer from "@/components/PriceDisclaimer";

const statusConfig: Record<string, { bg: string; label: string }> = {
  pending: { bg: "bg-amber-500", label: "Pending" },
  confirmed: { bg: "bg-blue-500", label: "Confirmed" },
  preparing: { bg: "bg-orange-500", label: "Preparing" },
  out_for_delivery: { bg: "bg-violet-500", label: "Out for Delivery" },
  delivered: { bg: "bg-success", label: "Delivered" },
  cancelled: { bg: "bg-destructive", label: "Cancelled" },
};

const Orders = () => {
  const { user, loading: authLoading } = useAuth();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("orders")
        .select(`*, stores (name), order_items (*)`)
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
          <div className="container mx-auto px-4 text-center py-20">
            <h1 className="font-display text-2xl font-bold mb-2">Please log in</h1>
            <p className="text-muted-foreground mb-6">Log in to view your order history</p>
            <Link to="/login"><Button className="rounded-full">Log In</Button></Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-16">
        <div className="bg-secondary/50 border-b border-border">
          <div className="container mx-auto px-4 py-8">
            <h1 className="font-display text-3xl font-bold text-foreground mb-1">My Orders</h1>
            <p className="text-muted-foreground text-sm">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 max-w-3xl">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground mb-1.5">No orders yet</h2>
              <p className="text-muted-foreground text-sm mb-6">Start ordering from your favourite stores!</p>
              <Link to="/stores">
                <Button className="gap-2 rounded-full">
                  Browse Stores <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <PriceDisclaimer variant="subtle" />
              {orders.map((order) => {
                const status = statusConfig[order.status || "pending"];
                return (
                  <div key={order.id} className="bg-card rounded-2xl border border-border p-5 hover:border-primary/10 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <h3 className="font-display text-base font-bold text-foreground">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </h3>
                          <Badge className={`${status.bg} text-white text-[10px] font-medium px-2 py-0.5`}>
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(order.created_at).toLocaleDateString("en-CA", {
                              year: "numeric", month: "short", day: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                          {order.stores && (
                            <span className="flex items-center gap-1">
                              <Package className="h-3.5 w-3.5" /> {order.stores.name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" /> {order.delivery_address}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xl font-bold text-primary">${Number(order.total).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{order.order_items?.length || 0} items</p>
                        </div>
                      </div>
                    </div>

                    {order.order_items && order.order_items.length > 0 && (
                      <div className="pt-3 border-t border-border flex flex-wrap gap-1.5">
                        {order.order_items.slice(0, 4).map((item: any) => (
                          <Badge key={item.id} variant="secondary" className="text-xs font-normal">
                            {item.quantity}× {item.product_name}
                          </Badge>
                        ))}
                        {order.order_items.length > 4 && (
                          <Badge variant="outline" className="text-xs">+{order.order_items.length - 4} more</Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Orders;
