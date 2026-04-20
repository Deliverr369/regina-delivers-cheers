import { useEffect, useState, useCallback } from "react";
import { Loader2, Sparkles, ImageIcon, AlertTriangle, Check, Play, Clock, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface JobRow {
  id: string;
  source_url: string;
  source_label: string;
  enabled: boolean;
  batch_size: number;
  min_score: number;
  last_run_at: string | null;
  last_processed: number | null;
  last_updated: number | null;
  last_remaining: number | null;
  last_error: string | null;
  total_updated: number;
  total_runs: number;
}

const DashboardMatchImages = () => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [missingTotal, setMissingTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  const refresh = useCallback(async () => {
    const [{ data: j }, { count }] = await Promise.all([
      supabase.from("image_match_jobs").select("*").order("source_label"),
      supabase.from("products").select("id", { count: "exact", head: true })
        .or("image_url.is.null,image_url.eq.").eq("is_hidden", false),
    ]);
    setJobs((j as any) ?? []);
    setMissingTotal(count ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 8000);
    return () => clearInterval(i);
  }, [refresh]);

  const updateJob = async (id: string, patch: Partial<JobRow>) => {
    const { error } = await supabase.from("image_match_jobs").update(patch).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    refresh();
  };

  const runNow = async () => {
    setTriggering(true);
    try {
      const { error } = await supabase.functions.invoke("match-images-cron", { body: {} });
      if (error) throw error;
      toast({ title: "Triggered", description: "Background batch running…" });
      setTimeout(refresh, 3000);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" });
    } finally {
      setTriggering(false);
    }
  };

  const anyEnabled = jobs.some((j) => j.enabled);
  const totalUpdated = jobs.reduce((s, j) => s + (j.total_updated ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Background Image Matcher
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Toggle a source ON and the system will keep matching missing product images automatically — every minute, in the background. You can close this tab.
        </p>
      </div>

      <Card>
        <CardContent className="pt-5 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              {anyEnabled ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
              {missingTotal ?? "—"} products still missing images
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Total updated: <span className="tabular-nums font-medium text-foreground">{totalUpdated.toLocaleString()}</span></span>
              <Button size="sm" variant="outline" onClick={refresh} className="rounded-xl h-8">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" onClick={runNow} disabled={triggering || !anyEnabled} className="rounded-xl h-8">
                {triggering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Play className="h-3.5 w-3.5 mr-1.5" /> Run now</>}
              </Button>
            </div>
          </div>
          {!anyEnabled && (
            <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              All sources are paused. Toggle one ON below to start automatic background matching.
            </p>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((j) => {
            const startedTotal = (j.last_remaining ?? 0) + (j.total_updated ?? 0);
            const pct = startedTotal > 0 ? Math.round(((j.total_updated ?? 0) / startedTotal) * 100) : 0;
            return (
              <Card key={j.id} className="border-border/60">
                <CardContent className="pt-5 pb-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{j.source_label}</p>
                      <p className="text-xs text-muted-foreground truncate">{j.source_url}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={j.enabled ? "default" : "outline"} className="text-[10px]">
                        {j.enabled ? "Running" : "Paused"}
                      </Badge>
                      <Switch
                        checked={j.enabled}
                        onCheckedChange={(v) => updateJob(j.id, { enabled: v })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Batch size</Label>
                      <Input
                        type="number" min={1} max={10}
                        value={j.batch_size}
                        onChange={(e) => updateJob(j.id, { batch_size: Math.max(1, Math.min(10, Number(e.target.value) || 5)) })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Min score (0–2)</Label>
                      <Input
                        type="number" step="0.05" min={0} max={2}
                        value={j.min_score}
                        onChange={(e) => updateJob(j.id, { min_score: Number(e.target.value) || 0.5 })}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Session progress</span>
                      <span className="tabular-nums">{(j.total_updated ?? 0).toLocaleString()} updated · {pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-muted/40 py-2">
                      <p className="text-[10px] text-muted-foreground uppercase">Runs</p>
                      <p className="text-sm font-semibold tabular-nums">{j.total_runs}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 py-2">
                      <p className="text-[10px] text-muted-foreground uppercase">Last batch</p>
                      <p className="text-sm font-semibold tabular-nums">{j.last_updated ?? "—"}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 py-2">
                      <p className="text-[10px] text-muted-foreground uppercase">Remaining</p>
                      <p className="text-sm font-semibold tabular-nums">{j.last_remaining ?? "—"}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {j.last_run_at ? new Date(j.last_run_at).toLocaleString() : "Never run yet"}
                    </span>
                    {j.last_error ? (
                      <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="h-3 w-3 mr-1" />Error</Badge>
                    ) : j.last_run_at ? (
                      <Badge variant="outline" className="text-[10px]"><Check className="h-3 w-3 mr-1" />Healthy</Badge>
                    ) : null}
                  </div>
                  {j.last_error && (
                    <p className="text-[11px] text-destructive bg-destructive/10 rounded px-2 py-1.5 break-words">{j.last_error}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DashboardMatchImages;
