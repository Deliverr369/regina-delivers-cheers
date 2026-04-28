import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Package, Clock, MapPin, Loader2, ShoppingBag, ArrowRight, RotateCcw, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsNative } from "@/hooks/useIsNative";
import { useReorder } from "@/hooks/useReorder";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PriceDisclaimer from "@/components/PriceDisclaimer";
import PullToRefresh from "@/components/PullToRefresh";
import OrderTimeline from "@/components/OrderTimeline";

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
  const isNative = useIsNative();
  const { reorder } = useReorder();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading, refetch } = useQuery({
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

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["orders", user?.id] });
    await refetch();
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
      <main className={isNative ? "pt-header pb-16" : "pt-20 pb-16"}>
        <div className={isNative ? "bg-primary text-primary-foreground" : "bg-secondary/50 border-b border-border"}>
          <div className={isNative ? "px-4 pt-4 pb-4" : "container mx-auto px-4 py-8"}>
            <h1 className={`font-display font-bold ${isNative ? "text-[20px] text-primary-foreground" : "text-3xl text-foreground"} mb-1`}>My Orders</h1>
            <p className={isNative ? "text-[12.5px] text-primary-foreground/85" : "text-muted-foreground text-sm"}>
              {orders.length} order{orders.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className={isNative ? "px-3 py-3" : "container mx-auto px-4 py-6 max-w-3xl"}>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground mb-1.5">No orders yet</h2>
              <p className="text-muted-foreground text-sm mb-6 px-6">Start ordering from your favourite stores!</p>
              <Link to="/stores">
                <Button className="gap-2 rounded-full">
                  Browse Stores <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className={isNative ? "space-y-2.5" : "space-y-4"}>
              <PriceDisclaimer variant="subtle" />
              {orders.map((order) => {
                const status = statusConfig[order.status || "pending"];
                return (
                  <div key={order.id} className={`bg-card rounded-2xl border border-border ${isNative ? "p-4 shadow-sm" : "p-5 hover:border-primary/10 transition-colors"}`}>
                    <div className={`flex justify-between gap-3 ${isNative ? "items-start mb-2.5" : "flex-col md:flex-row md:items-center mb-3"}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <h3 className={`font-display font-bold text-foreground ${isNative ? "text-[14px]" : "text-base"}`}>
                            {order.stores?.name || `Order`}
                          </h3>
                          <Badge className={`${status.bg} text-white text-[10px] font-medium px-2 py-0.5`}>
                            {status.label}
                          </Badge>
                        </div>
                        <p className={`text-muted-foreground ${isNative ? "text-[11px]" : "text-xs"} mb-1`}>
                          #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground ${isNative ? "text-[11px]" : "text-xs"}`}>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(order.created_at).toLocaleDateString("en-CA", {
                              year: "numeric", month: "short", day: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                          {!isNative && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" /> {order.delivery_address}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-bold text-primary ${isNative ? "text-base" : "text-xl"}`}>${Number(order.total).toFixed(2)}</p>
                        <p className={`text-muted-foreground ${isNative ? "text-[10.5px]" : "text-xs"}`}>{order.order_items?.length || 0} items</p>
                      </div>
                    </div>

                    {order.order_items && order.order_items.length > 0 && (
                      <div className={`pt-2.5 border-t border-border flex flex-wrap gap-1.5 ${isNative ? "" : "pt-3"}`}>
                        {order.order_items.slice(0, isNative ? 3 : 4).map((item: any) => (
                          <Badge key={item.id} variant="secondary" className="text-[10.5px] font-normal">
                            {item.quantity}× {item.product_name}
                          </Badge>
                        ))}
                        {order.order_items.length > (isNative ? 3 : 4) && (
                          <Badge variant="outline" className="text-[10.5px]">+{order.order_items.length - (isNative ? 3 : 4)} more</Badge>
                        )}
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-border flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full gap-2 h-8 text-xs"
                        onClick={() => reorder(order as any)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Order again
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      {!isNative && <Footer />}
    </div>
  );
};

export default Orders;
