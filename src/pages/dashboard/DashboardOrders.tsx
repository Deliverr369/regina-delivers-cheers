import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Search, Filter, DollarSign } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { ConfirmFinalPriceDrawer } from "@/components/dashboard/ConfirmFinalPriceDrawer";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface Order {
  id: string;
  user_id: string;
  status: OrderStatus | null;
  total: number;
  subtotal: number;
  tax: number;
  delivery_fee: number | null;
  delivery_address: string;
  delivery_city: string | null;
  payment_method: string | null;
  created_at: string;
  payment_status: string | null;
  authorized_amount: number | null;
  estimated_total: number | null;
  final_total: number | null;
  stripe_payment_intent_id: string | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-indigo-100 text-indigo-800",
  out_for_delivery: "bg-violet-100 text-violet-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

const DashboardOrders = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confirmOrderId, setConfirmOrderId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to fetch orders", variant: "destructive" });
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast({ title: "Error", description: "Failed to update order status", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Order status updated" });
      fetchOrders();
    }
  };

  const filtered = orders.filter((o) => {
    const matchSearch = search === "" || o.id.includes(search) || o.delivery_address.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Order Management</h2>
        <p className="text-sm text-muted-foreground mt-1">Track and manage all customer orders</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Orders ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No orders found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((order) => (
                <div key={order.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-mono text-sm font-semibold text-foreground">#{order.id.slice(0, 8)}</p>
                      <Badge className={`${statusColors[order.status || "pending"]} text-[10px] font-medium capitalize border-0`}>
                        {(order.status || "pending").replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{order.delivery_address}{order.delivery_city ? `, ${order.delivery_city}` : ""}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(order.created_at).toLocaleString()} · {order.payment_method || "card"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="text-right">
                      <p className="font-bold text-foreground">${Number(order.final_total ?? order.total).toFixed(2)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {order.authorized_amount ? `Auth $${Number(order.authorized_amount).toFixed(2)}` : `Sub $${Number(order.subtotal).toFixed(2)}`} · {order.payment_status || "pending"}
                      </p>
                    </div>
                    {order.payment_status !== "captured" && order.status !== "cancelled" && (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-9"
                        onClick={() => { setConfirmOrderId(order.id); setConfirmOpen(true); }}
                      >
                        <DollarSign className="h-3.5 w-3.5 mr-1" />
                        {order.stripe_payment_intent_id ? "Confirm & Capture" : "Set final price"}
                      </Button>
                    )}
                    <Select
                      value={order.status || "pending"}
                      onValueChange={(val) => updateStatus(order.id, val as OrderStatus)}
                    >
                      <SelectTrigger className="w-[150px] h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="preparing">Preparing</SelectItem>
                        <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmFinalPriceDrawer
        orderId={confirmOrderId}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onCaptured={fetchOrders}
      />
    </div>
  );
};

export default DashboardOrders;
