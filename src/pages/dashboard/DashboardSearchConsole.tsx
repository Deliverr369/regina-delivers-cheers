import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Globe,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  Loader2,
  ArrowRightLeft,
  Ban,
  HelpCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface GscUrlStatus {
  id: string;
  url: string;
  verdict: string | null;
  coverage_state: string | null;
  robots_txt_state: string | null;
  indexing_state: string | null;
  page_fetch_state: string | null;
  last_crawl_time: string | null;
  google_canonical: string | null;
  user_canonical: string | null;
  inspected_at: string;
}

type IssueGroup = "all" | "indexed" | "soft404" | "notfound" | "redirect" | "noindex" | "not_indexed" | "other";

function groupOf(row: GscUrlStatus): Exclude<IssueGroup, "all"> {
  const c = (row.coverage_state || "").toLowerCase();
  if (row.verdict === "PASS" || c.includes("submitted and indexed") || c === "indexed") return "indexed";
  if (c.includes("soft 404")) return "soft404";
  if (c.includes("not found") || c.includes("404")) return "notfound";
  if (c.includes("redirect")) return "redirect";
  if (c.includes("noindex")) return "noindex";
  if (c.includes("not indexed") || c.includes("unknown")) return "not_indexed";
  return "other";
}

const groupMeta: Record<Exclude<IssueGroup, "all">, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  indexed: { label: "Indexed", className: "border-green-500/40 text-green-700 bg-green-500/10", Icon: CheckCircle2 },
  soft404: { label: "Soft 404", className: "border-destructive/40 text-destructive bg-destructive/10", Icon: XCircle },
  notfound: { label: "Not found (404)", className: "border-destructive/40 text-destructive bg-destructive/10", Icon: XCircle },
  redirect: { label: "Redirect", className: "border-amber-500/40 text-amber-700 bg-amber-500/10", Icon: ArrowRightLeft },
  noindex: { label: "Noindex", className: "border-amber-500/40 text-amber-700 bg-amber-500/10", Icon: Ban },
  not_indexed: { label: "Waiting in Google's queue", className: "border-muted-foreground/30 text-muted-foreground bg-muted", Icon: Loader2 },
  other: { label: "Other", className: "border-muted-foreground/30 text-muted-foreground bg-muted", Icon: HelpCircle },
};

export default function DashboardSearchConsole() {
  const [rows, setRows] = useState<GscUrlStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<IssueGroup>("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("gsc_url_status")
      .select("*")
      .order("inspected_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error("Couldn't load the Search Console data: " + error.message);
    } else {
      setRows((data as GscUrlStatus[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    toast.info("Asking Google about every page — this takes about a minute.");
    const { data, error } = await supabase.functions.invoke("gsc-index-status");
    if (error) {
      toast.error("Couldn't refresh from Google: " + error.message);
    } else if (data?.ok) {
      toast.success(`Google checked ${data.inspected} of ${data.total} pages.`);
      if (data.stoppedEarly) {
        toast.warning("Google's daily limit was reached — the rest will be checked next time.");
      }
      await load();
    } else {
      toast.error("Refresh failed: " + (data?.error || "unknown error"));
    }
    setRefreshing(false);
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) {
      const g = groupOf(r);
      c[g] = (c[g] ?? 0) + 1;
    }
    return c;
  }, [rows]);

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => groupOf(r) === filter)),
    [rows, filter],
  );

  const lastRun = rows[0]?.inspected_at ? new Date(rows[0].inspected_at).toLocaleString() : null;
  const issueCount = (counts.soft404 ?? 0) + (counts.notfound ?? 0) + (counts.redirect ?? 0) + (counts.noindex ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" /> Search Console Monitor
          </h1>
          <p className="text-muted-foreground mt-1">
            What Google thinks of each page on deliverr.ca — indexed pages, soft 404s, redirects, and excluded URLs.
            {lastRun ? ` Last checked ${lastRun}.` : " No check has run yet."}
          </p>
        </div>
        <Button onClick={refresh} disabled={refreshing}>
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {refreshing ? "Checking with Google…" : "Refresh from Google"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Indexed</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-700">{counts.indexed ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Soft 404 / Not found</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{(counts.soft404 ?? 0) + (counts.notfound ?? 0)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Redirects / Noindex</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold text-amber-700">{(counts.redirect ?? 0) + (counts.noindex ?? 0)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Waiting in queue</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold text-muted-foreground">{counts.not_indexed ?? 0}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pages ({filtered.length})</CardTitle>
          <CardDescription>
            {issueCount > 0
              ? `${issueCount} page${issueCount === 1 ? "" : "s"} need attention. Old /city/ links redirect on purpose — those clear once Google recrawls.`
              : "No page problems found in the last check."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as IssueGroup)}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">All ({rows.length})</TabsTrigger>
              <TabsTrigger value="indexed">Indexed ({counts.indexed ?? 0})</TabsTrigger>
              <TabsTrigger value="soft404">Soft 404 ({counts.soft404 ?? 0})</TabsTrigger>
              <TabsTrigger value="notfound">404 ({counts.notfound ?? 0})</TabsTrigger>
              <TabsTrigger value="redirect">Redirects ({counts.redirect ?? 0})</TabsTrigger>
              <TabsTrigger value="noindex">Noindex ({counts.noindex ?? 0})</TabsTrigger>
              <TabsTrigger value="not_indexed">In queue ({counts.not_indexed ?? 0})</TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <MinusCircle className="h-4 w-4" /> Nothing here yet — press "Refresh from Google" to run the first check.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((r) => {
                const g = groupOf(r);
                const meta = groupMeta[g];
                return (
                  <li key={r.id} className="py-3 flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={meta.className}>
                        <meta.Icon className="mr-1 h-3 w-3" /> {meta.label}
                      </Badge>
                      <span className="text-sm font-medium break-all">{r.url.replace("https://deliverr.ca", "")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.coverage_state || "No coverage state"}
                      {r.last_crawl_time ? ` · crawled ${new Date(r.last_crawl_time).toLocaleDateString()}` : ""}
                      {r.google_canonical && r.google_canonical !== r.url ? ` · Google prefers ${r.google_canonical}` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
