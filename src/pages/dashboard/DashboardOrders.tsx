import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

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
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-indigo-100 text-indigo-800",
  out_for_delivery: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const DashboardOrders = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="text-muted-foreground">Loading orders...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Order Management</h2>

      <Card>
        <CardHeader>
          <CardTitle>All Orders ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No orders found.</p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-mono text-sm font-medium text-foreground">{order.id.slice(0, 8)}</p>
                      <Badge className={statusColors[order.status || "pending"]} variant="secondary">
                        {(order.status || "pending").replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{order.delivery_address}, {order.delivery_city}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString()} · {order.payment_method || "card"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-foreground">${Number(order.total).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        Sub: ${Number(order.subtotal).toFixed(2)} + Tax: ${Number(order.tax).toFixed(2)}
                      </p>
                    </div>
                    <Select
                      value={order.status || "pending"}
                      onValueChange={(val) => updateStatus(order.id, val as OrderStatus)}
                    >
                      <SelectTrigger className="w-40">
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
    </div>
  );
};

export default DashboardOrders;
