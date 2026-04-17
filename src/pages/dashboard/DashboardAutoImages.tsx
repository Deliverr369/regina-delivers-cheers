import { useState, useEffect, useCallback } from "react";
import { Upload, Loader2, Check, X, ImagePlus, RefreshCw, Folder, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Job {
  id: string;
  storage_path: string;
  file_name: string;
  status: string;
  identified_name: string | null;
  identified_category: string | null;
  identified_size: string | null;
  is_existing: boolean | null;
  confidence: string | null;
  final_image_url: string | null;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
}

const WATCH_FOLDER = "bulk-auto";

const DashboardAutoImages = () => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchJobs = useCallback(async () => {
    const { data, error } = await supabase
      .from("bulk_image_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!error && data) setJobs(data as Job[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchJobs();
    // Poll every 10s for live updates
    const interval = setInterval(fetchJobs, 10000);

    // Realtime subscription
    const channel = supabase
      .channel("bulk_image_jobs_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "bulk_image_jobs" }, () => fetchJobs())
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchJobs]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    let success = 0;
    let failed = 0;
    for (const file of files) {
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error } = await supabase.storage.from("store-images").upload(`${WATCH_FOLDER}/${fileName}`, file, { contentType: file.type });
      if (error) failed++; else success++;
    }
    setUploading(false);
    e.target.value = "";
    toast({ title: "Uploaded", description: `${success} image(s) queued, ${failed} failed. Processing runs every minute automatically.` });
    fetchJobs();
  };

  const triggerNow = async () => {
    setProcessing(true);
    const { error } = await supabase.functions.invoke("process-bulk-images", { body: {} });
    setProcessing(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Processor triggered", description: "Refreshing in a few seconds..." });
    setTimeout(fetchJobs, 3000);
  };

  const counts = {
    pending: jobs.filter((j) => j.status === "pending").length,
    processing: jobs.filter((j) => j.status === "processing").length,
    assigned: jobs.filter((j) => j.status === "assigned").length,
    skipped: jobs.filter((j) => j.status === "skipped").length,
    error: jobs.filter((j) => j.status === "error").length,
  };

  const statusBadge = (job: Job) => {
    switch (job.status) {
      case "pending": return <Badge variant="secondary" className="text-[10px]">⏳ Queued</Badge>;
      case "processing": return <Badge variant="secondary" className="text-[10px] animate-pulse">🔄 Processing...</Badge>;
      case "assigned": return <Badge className="text-[10px] bg-emerald-600 border-0"><Check className="h-3 w-3 mr-1" />Assigned</Badge>;
      case "skipped": return <Badge variant="outline" className="text-[10px]">⏭ Skipped</Badge>;
      case "error": return <Badge variant="destructive" className="text-[10px]">⚠ {job.error_message?.slice(0, 30) || "Error"}</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">{job.status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Auto Image Processor
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Drop images into the watched folder — the system identifies & assigns them automatically every minute. No need to keep this tab open.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={triggerNow} disabled={processing} className="rounded-xl">
          {processing ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
          Run Now
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Queued", count: counts.pending, color: "text-amber-600" },
          { label: "Processing", count: counts.processing, color: "text-blue-600" },
          { label: "Assigned", count: counts.assigned, color: "text-emerald-600" },
          { label: "Skipped", count: counts.skipped, color: "text-muted-foreground" },
          { label: "Errors", count: counts.error, color: "text-destructive" },
        ].map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="pt-4 pb-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upload area */}
      <Card className="border-dashed border-2 border-border hover:border-primary/40 transition-colors">
        <CardContent className="pt-6">
          <label className="flex flex-col items-center justify-center h-40 cursor-pointer">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              {uploading ? <Loader2 className="h-7 w-7 text-primary animate-spin" /> : <ImagePlus className="h-7 w-7 text-primary" />}
            </div>
            <span className="text-sm font-medium text-foreground">
              {uploading ? "Uploading..." : "Drop images or click to upload"}
            </span>
            <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Folder className="h-3 w-3" /> Saved to <code className="px-1.5 py-0.5 bg-muted rounded text-[10px]">store-images/{WATCH_FOLDER}/</code>
            </span>
            <span className="text-[11px] text-muted-foreground mt-2">Auto-processed every minute • Close this tab anytime</span>
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </CardContent>
      </Card>

      {/* Jobs list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : jobs.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Folder className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No images uploaded yet. Drop some above to get started.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {jobs.map((job) => (
            <Card key={job.id} className="overflow-hidden border-border/50 hover:shadow-md transition-shadow">
              <div className="relative aspect-square bg-muted/50">
                {job.final_image_url ? (
                  <img src={job.final_image_url} alt={job.identified_name || "Image"} className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImagePlus className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <CardContent className="p-2.5 space-y-1.5">
                {job.identified_name ? (
                  <>
                    <p className="font-medium text-xs truncate">{job.identified_name}</p>
                    <div className="flex gap-1 flex-wrap">
                      {job.identified_category && <Badge variant="outline" className="text-[10px] h-4">{job.identified_category}</Badge>}
                      {job.identified_size && <Badge variant="outline" className="text-[10px] h-4">{job.identified_size}</Badge>}
                    </div>
                  </>
                ) : (
                  <p className="text-[11px] text-muted-foreground truncate">{job.file_name}</p>
                )}
                {statusBadge(job)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardAutoImages;
