import { useEffect, useState } from "react";
import { MessageSquare, RefreshCw, CheckCircle2, XCircle, MinusCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface SmsLog {
  id: string;
  recipient: string | null;
  title: string | null;
  body: string;
  kind: string;
  status: string;
  twilio_sid: string | null;
  twilio_status: string | null;
  error_message: string | null;
  order_id: string | null;
  created_at: string;
}

const PAGE_SIZE = 50;

const statusMeta: Record<string, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  sent: { label: "Sent", className: "border-green-500/40 text-green-700 bg-green-500/10", Icon: CheckCircle2 },
  failed: { label: "Failed", className: "border-destructive/40 text-destructive bg-destructive/10", Icon: XCircle },
  skipped: { label: "Skipped", className: "border-amber-500/40 text-amber-700 bg-amber-500/10", Icon: MinusCircle },
  queued: { label: "Queued", className: "border-muted-foreground/30 text-muted-foreground bg-muted", Icon: Loader2 },
};

export default function DashboardSmsLog() {
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "sent" | "failed" | "skipped">("all");

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("sms_logs")
      .select("id, recipient, title, body, kind, status, twilio_sid, twilio_status, error_message, order_id, created_at")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (filter !== "all") query = query.eq("status", filter);

    const { data, error } = await query;
    if (error) {
      toast.error("Couldn't load the text message log: " + error.message);
    } else {
      setLogs((data ?? []) as SmsLog[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const counts = {
    sent: logs.filter((l) => l.status === "sent").length,
    failed: logs.filter((l) => l.status === "failed").length,
    skipped: logs.filter((l) => l.status === "skipped").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-primary" /> Text Message Log
          </h1>
          <p className="text-muted-foreground mt-1">
            Every order alert sent by text — whether it went out, was skipped, or failed.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent messages</CardTitle>
          <CardDescription>
            Showing the latest {PAGE_SIZE} messages. In this view: {counts.sent} sent, {counts.failed} failed,{" "}
            {counts.skipped} skipped.
          </CardDescription>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="pt-2">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
              <TabsTrigger value="skipped">Skipped</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : logs.length === 0 ? (
            <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-8 text-center">
              No messages here yet. New order alerts will appear as soon as they are sent.
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                const meta = statusMeta[log.status] ?? statusMeta.queued;
                const { Icon } = meta;
                return (
                  <div key={log.id} className="rounded-lg border p-3 bg-muted/20">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={meta.className}>
                        <Icon className="h-3 w-3 mr-1" />
                        {meta.label}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {log.kind === "owner" ? "Owner alert" : "Customer"}
                      </Badge>
                      <span className="text-sm font-medium">{log.recipient ?? "No number"}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm mt-2 whitespace-pre-wrap">{log.body}</p>
                    {log.error_message && (
                      <p className="text-xs text-destructive mt-1.5">{log.error_message}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-1.5 text-[11px] text-muted-foreground font-mono">
                      {log.twilio_status && <span>carrier: {log.twilio_status}</span>}
                      {log.twilio_sid && <span>{log.twilio_sid}</span>}
                      {log.order_id && <span>order {log.order_id.slice(0, 8).toUpperCase()}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
