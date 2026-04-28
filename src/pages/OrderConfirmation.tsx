import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle, Package, Clock, ArrowRight, MessageSquare, ShieldCheck, Receipt, Store as StoreIcon, CalendarClock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PriceDisclaimer from "@/components/PriceDisclaimer";
import OrderTimeline from "@/components/OrderTimeline";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type StatusKey = "pending" | "confirmed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";

interface ConfirmationOrder {
  id: string;
  status: StatusKey;
  total: number;
  delivery_fee: number | null;
  delivery_type: string | null;
  delivery_scheduled_at: string | null;
  delivery_window: string | null;
  created_at: string;
  store_id: string | null;
  stores: { id: string; name: string; delivery_time: string | null } | null;
}

const ETA_BY_STORE = (storeName: string | undefined | null) => {
  const n = (storeName || "").toLowerCase();
  if (n.includes("costco")) return "45–60 min";
  if (n.includes("superstore")) return "35–50 min";
  return "25–40 min";
};

const STATUS_LABEL: Record<StatusKey, string> = {
  pending: "Order received",
  confirmed: "Confirmed",
  preparing: "Shopper picking items",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_TONE: Record<StatusKey, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-sky-500",
  preparing: "bg-indigo-500",
  out_for_delivery: "bg-violet-500",
  delivered: "bg-emerald-500",
  cancelled: "bg-rose-500",
};

const OrderConfirmation = () => {
  const location = useLocation();
  const { user } = useAuth();
  const orderIds: string[] = (location.state as any)?.orderIds || [];
  const [orders, setOrders] = useState<ConfirmationOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial fetch — by ids if available, otherwise pull the user's most recent
  // orders created in the last 5 minutes (covers a hard-refresh fallback).
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("orders")
        .select("id, status, total, delivery_fee, delivery_type, delivery_scheduled_at, delivery_window, created_at, store_id, stores ( id, name, delivery_time )")
        .order("created_at", { ascending: false });
      if (orderIds.length > 0) {
        q = q.in("id", orderIds);
      } else {
        const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        q = q.eq("user_id", user.id).gte("created_at", since).limit(10);
      }
      const { data } = await q;
      if (cancelled) return;
      setOrders((data as any) || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, orderIds.join(",")]);

  // Realtime: keep status in sync as the dashboard advances each order.
  // Topic must include the user's id so it passes realtime.messages RLS.
  useEffect(() => {
    if (orders.length === 0 || !user) return;
    const ids = orders.map((o) => o.id);
    const channel = supabase
      .channel(`order-confirmation-${user.id}-${ids[0]}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=in.(${ids.join(",")})` },
        (payload) => {
          const updated = payload.new as any;
          setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orders.map((o) => o.id).join(","), user?.id]);

  const isSplit = orders.length > 1;
  const grandTotal = orders.reduce((s, o) => s + Number(o.total || 0), 0);
  const headerOrderId = orders[0]?.id?.slice(0, 8).toUpperCase() || "—";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-header pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto">
            {/* Success Icon */}
            <div className="flex flex-col items-center text-center pt-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-success/20 blur-2xl rounded-full animate-pulse" />
                <div className="relative w-24 h-24 rounded-full bg-success/10 flex items-center justify-center animate-scale-in">
                  <CheckCircle className="h-12 w-12 text-success" strokeWidth={2.2} />
                </div>
              </div>

              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 animate-fade-in">
                {isSplit ? `${orders.length} Orders Confirmed!` : "Order Confirmed!"}
              </h1>

              <p className="text-muted-foreground text-base mb-8 animate-fade-in px-4" style={{ animationDelay: "0.1s" }}>
                {isSplit
                  ? "Your items are being fulfilled by multiple stores. Track each below — they'll arrive separately."
                  : "Thank you for your order. Your beverages are on their way."}
              </p>
            </div>

            {/* Summary Card */}
            <div className="bg-card rounded-2xl border border-border p-6 mb-5 shadow-sm animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <div className="text-center mb-5 pb-5 border-b border-border">
                <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
                  <Receipt className="h-3 w-3" />
                  {isSplit ? `${orders.length} Orders · #${headerOrderId}…` : "Order Number"}
                </div>
                <div className="font-display text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
                  {isSplit ? `$${grandTotal.toFixed(2)}` : `#${headerOrderId}`}
                </div>
                {isSplit && (
                  <p className="text-[11px] text-muted-foreground mt-1">total across all stores</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Estimated</div>
                    <div className="font-semibold text-foreground text-sm truncate">
                      {orders[0]?.delivery_type === "scheduled" ? "Scheduled" : "25–45 min"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Status</div>
                    <div className="font-semibold text-foreground text-sm truncate">
                      {isSplit ? `${orders.length} stores` : STATUS_LABEL[orders[0]?.status || "pending"]}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Per-store tracking */}
            <div className="space-y-4 mb-5 animate-fade-in" style={{ animationDelay: "0.25s" }}>
              {loading && (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading order details…
                </div>
              )}
              {!loading && orders.map((order) => {
                const status = (order.status || "pending") as StatusKey;
                const storeName = order.stores?.name || "Order";
                const eta = order.delivery_type === "scheduled" ? null : (order.stores?.delivery_time || ETA_BY_STORE(storeName));
                return (
                  <div key={order.id} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <StoreIcon className="h-4 w-4 text-primary shrink-0" />
                          <h3 className="font-display font-bold text-foreground text-sm truncate">{storeName}</h3>
                          <Badge className={`${STATUS_TONE[status]} text-white text-[10px] font-medium px-2 py-0.5`}>
                            {STATUS_LABEL[status]}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-primary text-base">${Number(order.total).toFixed(2)}</p>
                        {Number(order.delivery_fee) > 0 && (
                          <p className="text-[10.5px] text-muted-foreground mt-0.5">
                            incl. ${Number(order.delivery_fee).toFixed(2)} delivery
                          </p>
                        )}
                      </div>
                    </div>

                    <OrderTimeline status={status} />

                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[11px]">
                      {order.delivery_type === "scheduled" && order.delivery_scheduled_at ? (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <CalendarClock className="h-3.5 w-3.5 text-primary" />
                          <span>
                            Scheduled{" "}
                            <span className="font-semibold text-foreground">
                              {new Date(order.delivery_scheduled_at).toLocaleDateString(undefined, {
                                weekday: "short", month: "short", day: "numeric",
                              })}
                            </span>
                            {order.delivery_window && (
                              <> · <span className="font-semibold text-foreground">{order.delivery_window}</span></>
                            )}
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          ETA <span className="font-semibold text-foreground">{eta}</span>
                        </span>
                      )}
                      <Link to="/orders" className="text-primary font-semibold hover:underline">
                        Details →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* What's Next */}
            <div className="bg-secondary/60 rounded-2xl p-5 sm:p-6 mb-5 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <h3 className="font-display font-bold text-foreground mb-4 text-base">What's next?</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <MessageSquare className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">
                    {isSplit
                      ? "You'll get notifications as each store advances its order."
                      : "You'll receive an SMS when your driver is on the way"}
                  </span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">Have your ID ready — we check everyone who looks under 25</span>
                </li>
                <li className="flex gap-3">
                  <Receipt className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">Your card is on hold; the final amount is captured after delivery</span>
                </li>
              </ul>
            </div>

            <PriceDisclaimer className="mb-6 text-left animate-fade-in" />

            <div className="flex flex-col sm:flex-row gap-3 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <Link to="/orders" className="flex-1">
                <Button variant="outline" className="w-full rounded-full h-11">
                  View All Orders
                </Button>
              </Link>
              <Link to="/stores" className="flex-1">
                <Button className="w-full gap-2 rounded-full h-11">
                  Continue Shopping
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OrderConfirmation;
