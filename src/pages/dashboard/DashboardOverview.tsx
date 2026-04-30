import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Users, Store, DollarSign, TrendingUp, Package, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, subDays, startOfDay, parseISO } from "date-fns";

interface RecentOrder {
  id: string;
  total: number;
  status: string | null;
  created_at: string;
  delivery_address: string;
}

interface DailyRow { date: string; orders: number; revenue: number }
interface StatusRow { status: string; count: number }

const CHART_COLORS = [
  "hsl(354, 75%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(250, 60%, 55%)",
  "hsl(40, 90%, 55%)",
  "hsl(210, 70%, 55%)",
  "hsl(0, 70%, 55%)",
];

const DashboardOverview = () => {
  const [stats, setStats] = useState({ orders: 0, revenue: 0, users: 0, stores: 0, pending: 0 });
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusRow[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const { data, error } = await supabase.rpc("get_dashboard_overview", { _days: 30 });
        if (error) throw error;
        const payload = (data as any) || {};
        const totals = payload.totals || {};
        setStats({
          orders: Number(totals.orders ?? 0),
          revenue: Number(totals.revenue ?? 0),
          users: Number(payload.users ?? 0),
          stores: Number(payload.stores ?? 0),
          pending: Number(totals.pending ?? 0),
        });
        setDaily(((payload.daily as any[]) || []).map((d) => ({
          date: String(d.date),
          orders: Number(d.orders),
          revenue: Number(d.revenue),
        })));
        setStatusCounts(((payload.status as any[]) || []).map((s) => ({
          status: String(s.status),
          count: Number(s.count),
        })));
        setRecentOrders(((payload.recent as any[]) || []) as RecentOrder[]);
      } catch (err) {
        console.error("Dashboard overview fetch failed", err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  // Build last-30-day series from server data (fill missing days)
  const dailyData = useMemo(() => {
    const map = new Map<string, DailyRow>();
    daily.forEach((d) => map.set(d.date, d));
    const out: { date: string; label: string; orders: number; revenue: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const key = format(day, "yyyy-MM-dd");
      const row = map.get(key);
      out.push({
        date: key,
        label: format(day, "MMM d"),
        orders: row?.orders ?? 0,
        revenue: row?.revenue ?? 0,
      });
    }
    return out;
  }, [daily]);

  const statusData = useMemo(
    () => statusCounts.map((s) => ({ name: s.status.replace(/_/g, " "), value: s.count })),
    [statusCounts]
  );

  const weeklyData = useMemo(() => {
    const weeks: { name: string; orders: number; revenue: number }[] = [];
    for (let w = 3; w >= 0; w--) {
      const start = subDays(new Date(), (w + 1) * 7);
      const end = subDays(new Date(), w * 7);
      const inRange = daily.filter((d) => {
        const dd = parseISO(d.date);
        return dd >= start && dd < end;
      });
      weeks.push({
        name: `Week ${4 - w}`,
        orders: inRange.reduce((s, d) => s + d.orders, 0),
        revenue: Math.round(inRange.reduce((s, d) => s + d.revenue, 0)),
      });
    }
    return weeks;
  }, [daily]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="pt-6"><div className="h-16 bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="pt-6"><div className="h-64 bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { title: "Total Orders (30d)", value: stats.orders, icon: ShoppingCart, color: "text-primary", bg: "bg-primary/10", trend: "+12%" },
    { title: "Revenue (30d)", value: `$${stats.revenue.toFixed(2)}`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", trend: "+8%" },
    { title: "Registered Users", value: stats.users, icon: Users, color: "text-violet-600", bg: "bg-violet-50", trend: "+5%" },
    { title: "Active Stores", value: stats.stores, icon: Store, color: "text-amber-600", bg: "bg-amber-50", trend: "—" },
  ];

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    confirmed: "bg-blue-100 text-blue-800",
    preparing: "bg-indigo-100 text-indigo-800",
    "out for delivery": "bg-violet-100 text-violet-800",
    delivered: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-background border border-border rounded-xl shadow-lg p-3 text-sm">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: entry.color }} />
            {entry.name}: {entry.name === "revenue" ? `$${entry.value.toFixed(2)}` : entry.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Dashboard Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">Welcome back! Here's what's happening with Deliverr.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-border/50 hover:shadow-md transition-shadow">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                </div>
                <div className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3">
                <TrendingUp className="h-3 w-3 text-emerald-600" />
                <span className="text-xs text-muted-foreground">{stat.trend} from last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Revenue & Orders — Last 30 Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(354, 75%, 55%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(354, 75%, 55%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(250, 60%, 55%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(250, 60%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 90%)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis yAxisId="rev" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={55} />
                <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Area yAxisId="rev" type="monotone" dataKey="revenue" stroke="hsl(354, 75%, 55%)" fill="url(#revenueGrad)" strokeWidth={2} name="revenue" />
                <Area yAxisId="ord" type="monotone" dataKey="orders" stroke="hsl(250, 60%, 55%)" fill="url(#ordersGrad)" strokeWidth={2} name="orders" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Weekly Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 90%)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="revenue" fill="hsl(354, 75%, 55%)" radius={[6, 6, 0, 0]} name="revenue" />
                  <Bar dataKey="orders" fill="hsl(250, 60%, 55%)" radius={[6, 6, 0, 0]} name="orders" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Order Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="h-56 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No order data yet</p>
              </div>
            ) : (
              <div className="h-56 flex items-center">
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2 pl-2">
                  {statusData.map((entry, i) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-xs text-muted-foreground capitalize flex-1">{entry.name}</span>
                      <span className="text-xs font-semibold text-foreground">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-medium text-foreground">#{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground truncate">{order.delivery_address}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <Badge className={`${statusColors[(order.status || "pending").replace(/_/g, " ")] || statusColors.pending} text-[10px] font-medium capitalize border-0`}>
                        {(order.status || "pending").replace(/_/g, " ")}
                      </Badge>
                      <p className="font-semibold text-foreground text-sm">${Number(order.total).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Avg Order Value", value: stats.orders > 0 ? `$${(stats.revenue / stats.orders).toFixed(2)}` : "$0.00" },
                { label: "Stores Active", value: `${stats.stores}` },
                { label: "Pending Orders", value: stats.pending.toString() },
                { label: "Total Customers", value: stats.users.toString() },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-xl bg-muted/40 text-center">
                  <p className="text-lg font-bold text-foreground">{item.value}</p>
                  <p className="text-[11px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;
