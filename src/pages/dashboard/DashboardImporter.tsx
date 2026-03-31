import { useState, useEffect } from "react";
import {
  Globe, Loader2, Search, Download, History, ArrowRight,
  CheckCircle2, XCircle, AlertTriangle, HelpCircle, Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ImportReviewQueue from "@/components/importer/ImportReviewQueue";
import ImportHistory from "@/components/importer/ImportHistory";

const DashboardImporter = () => {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [importType, setImportType] = useState("product_listing");
  const [sourceName, setSourceName] = useState("");
  const [scanning, setScanning] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("import");

  const handleScan = async () => {
    if (!url.trim()) {
      toast({ title: "Enter a URL", variant: "destructive" });
      return;
    }

    setScanning(true);
    setScanResult(null);
    setActiveSessionId(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Not authenticated", variant: "destructive" });
        setScanning(false);
        return;
      }

      const response = await supabase.functions.invoke("scrape-products", {
        body: { url: url.trim(), importType, sourceName: sourceName.trim() || undefined },
      });

      if (response.error) {
        throw new Error(response.error.message || "Scan failed");
      }

      const data = response.data;
      if (data.error) {
        throw new Error(data.error);
      }

      setScanResult(data);
      setActiveSessionId(data.sessionId);
      setActiveTab("review");
      toast({
        title: "Scan complete",
        description: `Found ${data.totalScanned} product(s)`,
      });
    } catch (err: any) {
      console.error("Scan error:", err);
      toast({
        title: "Scan failed",
        description: err.message || "Could not scan the URL",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Globe className="h-6 w-6 text-primary" />
          Website Importer
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Scan competitor or supplier URLs, extract product data, and import into your inventory through a safe review workflow.
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
            {scanResult && (
              <Badge className="ml-1 h-4 min-w-4 text-[9px] px-1 bg-primary text-primary-foreground rounded-full">
                {scanResult.totalScanned}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1.5">
            <History className="h-3.5 w-3.5" />History
          </TabsTrigger>
        </TabsList>

        {/* SCAN TAB */}
        <TabsContent value="import" className="mt-4 space-y-5">
          <div className="max-w-2xl">
            {/* URL Input Card */}
            <div className="border border-border/40 rounded-xl p-5 bg-card shadow-sm space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Website URL</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="https://example.com/products/beer"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="pl-9 h-10"
                      disabled={scanning}
                    />
                  </div>
                  <Button onClick={handleScan} disabled={scanning || !url.trim()} className="h-10 px-5">
                    {scanning ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scanning...</>
                    ) : (
                      <><Search className="h-4 w-4 mr-2" />Scan Products</>
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Paste a public product catalog or category page URL. Products will be extracted into a review queue — nothing is published automatically.
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
            </div>

            {/* Scan Result Summary */}
            {scanResult && (
              <div className="border border-border/40 rounded-xl p-4 bg-card shadow-sm mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <p className="font-semibold text-sm">Scan Complete</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { label: "Total Found", count: scanResult.totalScanned, color: "text-foreground" },
                    { label: "New Products", count: scanResult.matchSummary?.new || 0, color: "text-emerald-600" },
                    { label: "Possible Match", count: scanResult.matchSummary?.possible_match || 0, color: "text-amber-600" },
                    { label: "Exact Match", count: scanResult.matchSummary?.exact_match || 0, color: "text-primary" },
                  ].map(({ label, count, color }) => (
                    <div key={label} className="p-2.5 rounded-lg bg-muted/20 border border-border/30">
                      <p className={`text-lg font-bold tabular-nums ${color}`}>{count}</p>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  className="mt-3 w-full text-xs"
                  onClick={() => setActiveTab("review")}
                >
                  Review Products <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            )}

            {/* How It Works */}
            <div className="border border-border/40 rounded-xl p-4 bg-muted/10 mt-4">
              <p className="text-xs font-semibold mb-2 text-foreground">How it works</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                {[
                  { step: "1", title: "Paste URL", desc: "Enter a product page or catalog URL" },
                  { step: "2", title: "AI Extracts", desc: "Products, images, prices are detected" },
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

        {/* REVIEW TAB */}
        <TabsContent value="review" className="mt-4">
          <ImportReviewQueue sessionId={activeSessionId} onSessionChange={setActiveSessionId} />
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="mt-4">
          <ImportHistory onOpenSession={(id) => { setActiveSessionId(id); setActiveTab("review"); }} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardImporter;
