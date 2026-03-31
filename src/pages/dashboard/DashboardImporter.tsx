import { useState } from "react";
import {
  Globe, Loader2, Search, History, ArrowRight,
  CheckCircle2, Package, Plus, X, PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ImportReviewQueue from "@/components/importer/ImportReviewQueue";
import ImportHistory from "@/components/importer/ImportHistory";

const MAX_URLS = 10;

type UrlStatus = "idle" | "scanning" | "done" | "error";
type UrlEntry = { url: string; status: UrlStatus; error?: string };

const DashboardImporter = () => {
  const { toast } = useToast();
  const [urls, setUrls] = useState<UrlEntry[]>([{ url: "", status: "idle" }]);
  const [importType, setImportType] = useState("product_listing");
  const [sourceName, setSourceName] = useState("");
  const [scanning, setScanning] = useState(false);
  const [currentScanIndex, setCurrentScanIndex] = useState<number | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionIds, setActiveSessionIds] = useState<string[]>([]);
  const [totalResults, setTotalResults] = useState<{ totalScanned: number; new: number; possible_match: number; exact_match: number } | null>(null);
  const [activeTab, setActiveTab] = useState("import");

  const updateUrl = (index: number, value: string) => {
    setUrls(prev => prev.map((entry, i) => i === index ? { ...entry, url: value } : entry));
  };

  const addUrlSlot = () => {
    if (urls.length < MAX_URLS) {
      setUrls(prev => [...prev, { url: "", status: "idle" }]);
    }
  };

  const removeUrlSlot = (index: number) => {
    if (urls.length > 1) {
      setUrls(prev => prev.filter((_, i) => i !== index));
    }
  };

  const setUrlStatus = (index: number, status: UrlStatus, error?: string) => {
    setUrls(prev => prev.map((entry, i) => i === index ? { ...entry, status, error } : entry));
  };

  const validUrls = urls.filter(e => e.url.trim().length > 0);

  const handleBatchScan = async () => {
    if (validUrls.length === 0) {
      toast({ title: "Enter at least one URL", variant: "destructive" });
      return;
    }

    setScanning(true);
    setTotalResults(null);
    setActiveSessionId(null);
    setActiveSessionIds([]);
    setUrls(prev => prev.map(e => ({ ...e, status: "idle", error: undefined })));

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Not authenticated", variant: "destructive" });
      setScanning(false);
      return;
    }

    const aggregate = { totalScanned: 0, new: 0, possible_match: 0, exact_match: 0 };
    let lastSessionId: string | null = null;

    for (let i = 0; i < urls.length; i++) {
      const entry = urls[i];
      if (!entry.url.trim()) continue;

      setCurrentScanIndex(i);
      setUrlStatus(i, "scanning");

      try {
        const response = await supabase.functions.invoke("scrape-products", {
          body: { url: entry.url.trim(), importType, sourceName: sourceName.trim() || undefined },
        });

        if (response.error) throw new Error(response.error.message || "Scan failed");
        const data = response.data;
        if (data.error) throw new Error(data.error);

        setUrlStatus(i, "done");
        aggregate.totalScanned += data.totalScanned || 0;
        aggregate.new += data.matchSummary?.new || 0;
        aggregate.possible_match += data.matchSummary?.possible_match || 0;
        aggregate.exact_match += data.matchSummary?.exact_match || 0;
        lastSessionId = data.sessionId;
      } catch (err: any) {
        console.error(`Scan error for URL ${i + 1}:`, err);
        setUrlStatus(i, "error", err.message || "Failed");
      }
    }

    setTotalResults(aggregate);
    if (lastSessionId) setActiveSessionId(lastSessionId);
    setCurrentScanIndex(null);
    setScanning(false);

    const doneCount = urls.filter(e => e.status === "done" || e.url.trim() === "").length;
    toast({
      title: "Batch scan complete",
      description: `${aggregate.totalScanned} product(s) found across ${validUrls.length} URL(s)`,
    });

    if (aggregate.totalScanned > 0) setActiveTab("review");
  };

  const scannedCount = urls.filter(e => e.status === "done" || e.status === "error").length;
  const progressPercent = scanning && validUrls.length > 0 ? (scannedCount / validUrls.length) * 100 : 0;

  return (
    <div className="space-y-5 pb-12">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Globe className="h-6 w-6 text-primary" />
          Website Importer
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Add up to 10 URLs to scan sequentially. Products are extracted into a review queue.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9 bg-muted/30">
          <TabsTrigger value="import" className="text-xs gap-1.5">
            <Search className="h-3.5 w-3.5" />Scan & Import
          </TabsTrigger>
          <TabsTrigger value="review" className="text-xs gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Review Queue
            {totalResults && totalResults.totalScanned > 0 && (
              <Badge className="ml-1 h-4 min-w-4 text-[9px] px-1 bg-primary text-primary-foreground rounded-full">
                {totalResults.totalScanned}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1.5">
            <History className="h-3.5 w-3.5" />History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="mt-4 space-y-5">
          <div className="max-w-2xl">
            <div className="border border-border/40 rounded-xl p-5 bg-card shadow-sm space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Website URLs ({urls.length}/{MAX_URLS})</Label>
                  {urls.length < MAX_URLS && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addUrlSlot} disabled={scanning}>
                      <Plus className="h-3.5 w-3.5" /> Add URL
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {urls.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-4 text-right flex-shrink-0">{i + 1}</span>
                      <div className="relative flex-1">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="https://example.com/products/beer"
                          value={entry.url}
                          onChange={(e) => updateUrl(i, e.target.value)}
                          className={`pl-9 h-9 text-xs ${
                            entry.status === "done" ? "border-emerald-500/50 bg-emerald-500/5" :
                            entry.status === "error" ? "border-destructive/50 bg-destructive/5" :
                            entry.status === "scanning" ? "border-primary/50 bg-primary/5" : ""
                          }`}
                          disabled={scanning}
                        />
                      </div>
                      {entry.status === "done" && <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
                      {entry.status === "scanning" && <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />}
                      {entry.status === "error" && (
                        <span className="text-[10px] text-destructive flex-shrink-0 max-w-20 truncate" title={entry.error}>✕</span>
                      )}
                      {urls.length > 1 && !scanning && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeUrlSlot(i)}>
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {scanning && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Scanning URL {(currentScanIndex ?? 0) + 1} of {validUrls.length}</span>
                      <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-1.5" />
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground">
                  Add up to 10 URLs. They'll be scanned one by one — all results go into the review queue.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Import Type</Label>
                  <Select value={importType} onValueChange={setImportType}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="product_listing">Product Listing Page</SelectItem>
                      <SelectItem value="single_product">Single Product Page</SelectItem>
                      <SelectItem value="full_page">Full Page Scan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Source Name (optional)</Label>
                  <Input
                    placeholder="e.g. Competitor Store"
                    value={sourceName}
                    onChange={(e) => setSourceName(e.target.value)}
                    className="h-9 text-xs"
                    disabled={scanning}
                  />
                </div>
              </div>

              <Button onClick={handleBatchScan} disabled={scanning || validUrls.length === 0} className="w-full h-10">
                {scanning ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scanning {validUrls.length} URL(s)...</>
                ) : (
                  <><PlayCircle className="h-4 w-4 mr-2" />Scan {validUrls.length > 0 ? `${validUrls.length} URL(s)` : "Products"}</>
                )}
              </Button>
            </div>

            {/* Aggregated Results */}
            {totalResults && (
              <div className="border border-border/40 rounded-xl p-4 bg-card shadow-sm mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <p className="font-semibold text-sm">Batch Scan Complete</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { label: "Total Found", count: totalResults.totalScanned, color: "text-foreground" },
                    { label: "New Products", count: totalResults.new, color: "text-emerald-600" },
                    { label: "Possible Match", count: totalResults.possible_match, color: "text-amber-600" },
                    { label: "Exact Match", count: totalResults.exact_match, color: "text-primary" },
                  ].map(({ label, count, color }) => (
                    <div key={label} className="p-2.5 rounded-lg bg-muted/20 border border-border/30">
                      <p className={`text-lg font-bold tabular-nums ${color}`}>{count}</p>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
                <Button size="sm" className="mt-3 w-full text-xs" onClick={() => setActiveTab("review")}>
                  Review Products <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            )}

            {/* How It Works */}
            <div className="border border-border/40 rounded-xl p-4 bg-muted/10 mt-4">
              <p className="text-xs font-semibold mb-2 text-foreground">How it works</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                {[
                  { step: "1", title: "Add URLs", desc: "Enter up to 10 product page URLs" },
                  { step: "2", title: "AI Extracts", desc: "Each URL is scanned sequentially" },
                  { step: "3", title: "You Review", desc: "Edit, approve or reject each item" },
                  { step: "4", title: "Import", desc: "Approved items enter your inventory" },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="flex gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {step}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{title}</p>
                      <p className="text-[10px] text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          <ImportReviewQueue sessionId={activeSessionId} onSessionChange={setActiveSessionId} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <ImportHistory onOpenSession={(id) => { setActiveSessionId(id); setActiveTab("review"); }} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardImporter;
