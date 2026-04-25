import { useEffect, useState } from "react";
import { Bell, Send, Smartphone, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface DeviceToken {
  id: string;
  platform: string;
  device_name: string | null;
  created_at: string;
  last_seen_at: string;
  token: string;
}

interface SendResult {
  ok: boolean;
  sent?: number;
  failed?: number;
  total?: number;
  reason?: string;
  error?: string;
}

export default function DashboardPushTest() {
  const { user } = useAuth();
  const [title, setTitle] = useState("Test push 🔔");
  const [body, setBody] = useState("If you see this on your phone, push notifications are working!");
  const [link, setLink] = useState("/orders");
  const [devices, setDevices] = useState<DeviceToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<SendResult | null>(null);

  const loadDevices = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("device_tokens")
      .select("id, platform, device_name, created_at, last_seen_at, token")
      .eq("user_id", user.id)
      .order("last_seen_at", { ascending: false });
    if (error) {
      toast.error("Failed to load devices: " + error.message);
    } else {
      setDevices(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDevices();
  }, [user?.id]);

  const sendTest = async () => {
    if (!user) return;
    setSending(true);
    setLastResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: {
          user_id: user.id,
          title,
          body,
          link: link || null,
        },
      });
      if (error) throw error;
      setLastResult(data as SendResult);
      if ((data as SendResult).ok) {
        toast.success(`Push dispatched to ${(data as SendResult).sent ?? 0} device(s)`);
      } else {
        toast.error("Push failed: " + ((data as SendResult).error ?? "unknown"));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setLastResult({ ok: false, error: msg });
      toast.error("Push failed: " + msg);
    } finally {
      setSending(false);
    }
  };

  const removeDevice = async (id: string) => {
    const { error } = await supabase.from("device_tokens").delete().eq("id", id);
    if (error) {
      toast.error("Failed to remove device");
    } else {
      toast.success("Device removed");
      loadDevices();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bell className="h-7 w-7 text-primary" /> Push Notification Test
        </h1>
        <p className="text-muted-foreground mt-1">
          Send a test push to your own registered devices to verify the pipeline.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" /> Your registered devices
            <Badge variant="secondary" className="ml-1">{devices.length}</Badge>
          </CardTitle>
          <CardDescription>
            Devices appear here after you sign in on the iOS/Android app and grant push permission.
            Web browsers do not register here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : devices.length === 0 ? (
            <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-6 text-center">
              No devices registered yet. Install the native app, sign in with this account, and
              grant notification permission.
            </div>
          ) : (
            <div className="space-y-2">
              {devices.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="uppercase text-[10px]">{d.platform}</Badge>
                      <span className="text-sm font-medium">
                        {d.device_name ?? "Unnamed device"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate mt-1">
                      {d.token.slice(0, 24)}…{d.token.slice(-8)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Last seen {new Date(d.last_seen_at).toLocaleString()}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeDevice(d.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Send a test notification</CardTitle>
          <CardDescription>
            This calls the <code className="text-xs">send-push</code> backend function with your own
            user ID. The push goes only to your devices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="push-title">Title</Label>
            <Input
              id="push-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="push-body">Body</Label>
            <Textarea
              id="push-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="push-link">Tap link (optional)</Label>
            <Input
              id="push-link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/orders"
            />
          </div>

          <Button
            onClick={sendTest}
            disabled={sending || !title.trim() || !body.trim()}
            size="lg"
            className="w-full sm:w-auto"
          >
            {sending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</>
            ) : (
              <><Send className="h-4 w-4 mr-2" /> Send test push</>
            )}
          </Button>

          {lastResult && (
            <div
              className={`rounded-lg border p-4 text-sm ${
                lastResult.ok
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-destructive/30 bg-destructive/5"
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                {lastResult.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                {lastResult.ok ? "Dispatched" : "Failed"}
              </div>
              <pre className="mt-2 text-xs font-mono overflow-auto bg-background/50 p-2 rounded">
                {JSON.stringify(lastResult, null, 2)}
              </pre>
              {lastResult.ok && lastResult.sent === 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  No devices received the push. Register a device first by signing in on the mobile app.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
