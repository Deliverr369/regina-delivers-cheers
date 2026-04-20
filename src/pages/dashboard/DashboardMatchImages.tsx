import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, Sparkles, Play, Square, ImageIcon, AlertTriangle, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SOURCES: { url: string; label: string }[] = [
  { url: "https://shopliquoryxe.ca/", label: "Shop Liquor YXE" },
  { url: "https://willowparkwines-sk.com/", label: "Willow Park Wines SK" },
];

interface ResultEntry {
  id: string;
  name: string;
  status: string;
  image_url?: string;
  confidence?: string;
  applied_to?: number;
  error?: string;
  source: string;
  ts: number;
}

const DashboardMatchImages = () => {
  const { toast } = useToast();
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [missingTotal, setMissingTotal] = useState<number | null>(null);
  const [startingMissing, setStartingMissing] = useState<number | null>(null);
  const [updated, setUpdated] = useState(0);
  const stopRef = useRef(false);

  const fetchMissing = useCallback(async () => {
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .or("image_url.is.null,image_url.eq.")
      .eq("is_hidden", false);
    setMissingTotal(count ?? 0);
  }, []);

  useEffect(() => { fetchMissing(); }, [fetchMissing]);

  const runLoop = async (sourceUrl: string) => {
    if (running) return;
    setRunning(sourceUrl);
    setStartingMissing(missingTotal);
    setUpdated(0);
    stopRef.current = false;

    while (!stopRef.current) {
      const { data, error } = await supabase.functions.invoke("match-missing-images", {
        body: { sourceUrl, batchSize: 5, minScore: 0.5 },
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        break;
      }
      const payload = data as any;
      if (payload?.error) {
        toast({ title: "Job error", description: payload.error, variant: "destructive" });
        break;
      }
      const batchResults: any[] = payload?.results ?? [];
      const ts = Date.now();
      setResults((prev) => [
        ...batchResults.map((r) => ({ ...r, source: sourceUrl, ts })),
        ...prev,
      ].slice(0, 300));
      setUpdated((u) => u + (payload?.updated ?? 0));
      if (typeof payload?.remaining === "number") setMissingTotal(payload.remaining);
      if ((payload?.processed ?? 0) === 0) {
        toast({ title: "Done", description: "No more products missing images." });
        break;
      }
      // Soft pause to respect Firecrawl rate limits
      await new Promise((r) => setTimeout(r, 1500));
    }

    setRunning(null);
    fetchMissing();
  };

  const stop = () => { stopRef.current = true; };

  const progressPct = (() => {
    if (startingMissing == null || missingTotal == null || startingMissing === 0) return 0;
    const done = startingMissing - missingTotal;
    return Math.max(0, Math.min(100, Math.round((done / startingMissing) * 100)));
  })();

  const statusBadge = (s: string) => {
    if (s === "matched") return <Badge className="bg-emerald-600 border-0 text-[10px]"><Check className="h-3 w-3 mr-1" />Matched</Badge>;
    if (s === "no_match") return <Badge variant="outline" className="text-[10px]">No match</Badge>;
    if (s === "no_candidates") return <Badge variant="outline" className="text-[10px]">No candidates</Badge>;
    if (s === "no_scrape") return <Badge variant="outline" className="text-[10px]">Scrape failed</Badge>;
    if (s === "error" || s === "update_failed") return <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="h-3 w-3 mr-1" />Error</Badge>;
    return <Badge variant="secondary" className="text-[10px]">{s}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Match Missing Images from Web
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Automatically find and apply product images by scraping competitor catalogs and matching with AI.
        </p>
      </div>

      <Card>
        <CardContent className="pt-5 pb-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground flex items-center gap-2">
              {running ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
              {missingTotal ?? "—"} products still missing images
            </span>
            {startingMissing != null && (
              <span className="text-xs text-muted-foreground tabular-nums">
                Updated this session: {updated.toLocaleString()} • {progressPct}%
              </span>
            )}
          </div>
          {startingMissing != null && <Progress value={progressPct} className="h-2" />}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SOURCES.map((s) => {
          const isThis = running === s.url;
          return (
            <Card key={s.url} className="border-border/60">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{s.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.url}</p>
                  </div>
                  {isThis ? (
                    <Button size="sm" variant="destructive" onClick={stop} className="rounded-xl">
                      <Square className="h-3.5 w-3.5 mr-1.5" /> Stop
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => runLoop(s.url)}
                      disabled={!!running}
                      className="rounded-xl"
                    >
                      <Play className="h-3.5 w-3.5 mr-1.5" /> Start
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="pt-4">
          <p className="text-sm font-medium mb-3 text-foreground">Recent matches</p>
          {results.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No matches yet. Hit Start above.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {results.map((r, i) => (
                <Card key={`${r.id}-${r.ts}-${i}`} className="overflow-hidden border-border/50">
                  <div className="relative aspect-square bg-muted/40">
                    {r.image_url ? (
                      <img src={r.image_url} alt={r.name} className="w-full h-full object-contain p-2" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-2.5 space-y-1">
                    <p className="text-xs font-medium truncate">{r.name}</p>
                    <div className="flex flex-wrap gap-1">
                      {statusBadge(r.status)}
                      {r.confidence && <Badge variant="outline" className="text-[10px] h-4">{r.confidence}</Badge>}
                      {r.applied_to ? <Badge variant="outline" className="text-[10px] h-4">×{r.applied_to}</Badge> : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardMatchImages;
