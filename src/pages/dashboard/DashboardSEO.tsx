import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Search, RotateCw, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const BATCH_SIZE = 10;

const DashboardSEO = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState({ total: 0, withSeo: 0 });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [force, setForce] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, failed: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  const loadStats = async () => {
    setLoading(true);
    const [{ count: total }, { count: withSeo }, { data: latest }] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id", { count: "exact", head: true }).not("seo_generated_at", "is", null),
      supabase
        .from("products")
        .select("id, name, category, seo_meta_title, seo_meta_description, seo_keywords, seo_generated_at")
        .not("seo_generated_at", "is", null)
        .order("seo_generated_at", { ascending: false })
        .limit(8),
    ]);
    setStats({ total: total ?? 0, withSeo: withSeo ?? 0 });
    setRecent(latest || []);
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const runOnce = async () => {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) {
      toast({ title: "Not authenticated", variant: "destructive" });
      return null;
    }
    const { data, error } = await supabase.functions.invoke("generate-seo-content", {
      body: { batch_size: BATCH_SIZE, force },
    });
    if (error) throw error;
    return data;
  };

  const handleStart = async () => {
    setRunning(true);
    setProgress({ processed: 0, failed: 0 });
    try {
      let totalProcessed = 0;
      let totalFailed = 0;
      let remaining = Infinity;

      while (remaining > 0) {
        const data: any = await runOnce();
        if (!data) break;
        totalProcessed += data.processed || 0;
        totalFailed += data.failed || 0;
        remaining = data.remaining ?? 0;
        setProgress({ processed: totalProcessed, failed: totalFailed });
        if ((data.processed || 0) === 0 && (data.failed || 0) === 0) break;
        await new Promise((r) => setTimeout(r, 600));
      }

      toast({
        title: "SEO generation complete",
        description: `Generated for ${totalProcessed} products. ${totalFailed} failed.`,
      });
      loadStats();
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const pct = stats.total ? Math.round((stats.withSeo / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" />
            SEO Content Generator
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-generated SEO descriptions, meta tags & keywords for Google ranking in Regina.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total products</CardDescription>
            <CardTitle className="text-3xl">{loading ? "—" : stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>SEO-optimized</CardDescription>
            <CardTitle className="text-3xl text-primary">{loading ? "—" : stats.withSeo}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Coverage</CardDescription>
            <CardTitle className="text-3xl">{loading ? "—" : `${pct}%`}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={pct} className="h-2" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Generation</CardTitle>
          <CardDescription>
            Processes products in batches of {BATCH_SIZE}. Safe to leave running — it will keep going until done.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch id="force" checked={force} onCheckedChange={setForce} />
            <Label htmlFor="force">Regenerate already-optimized products (force overwrite)</Label>
          </div>

          {running && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="font-medium">Generating SEO content…</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Processed: <span className="font-semibold text-foreground">{progress.processed}</span> ·
                Failed: <span className="font-semibold text-destructive">{progress.failed}</span>
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleStart} disabled={running} size="lg">
              {running ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running…</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Start SEO Generation</>
              )}
            </Button>
            <Button variant="outline" onClick={loadStats} disabled={loading || running}>
              <RotateCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" /> Recently Generated
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No SEO content generated yet.</p>
          ) : (
            <div className="space-y-3">
              {recent.map((p) => (
                <div key={p.id} className="border rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm">{p.name}</p>
                    <Badge variant="secondary" className="text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />{p.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Title:</span> {p.seo_meta_title}</p>
                  <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Meta:</span> {p.seo_meta_description}</p>
                  {p.seo_keywords?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {p.seo_keywords.slice(0, 8).map((k: string) => (
                        <Badge key={k} variant="outline" className="text-[10px]">{k}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardSEO;
