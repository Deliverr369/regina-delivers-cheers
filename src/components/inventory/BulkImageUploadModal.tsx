import { useState, useCallback, useRef } from "react";
import {
  ImagePlus, Upload, Loader2, Check, X, Search, ChevronDown,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { processProductImage } from "@/utils/imageProcessor";
import type { ProductGroup } from "@/hooks/useInventoryData";

interface UploadImage {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "matching" | "matched" | "uploaded" | "error";
  matchedGroup?: ProductGroup;
  confidence?: "high" | "medium" | "low" | "none";
  error?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  allGroups: ProductGroup[];
  onRefresh: () => void;
}

const BulkImageUploadModal = ({ open, onClose, allGroups, onRefresh }: Props) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<UploadImage[]>([]);
  const [step, setStep] = useState<"upload" | "review" | "done">("upload");
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const matchFileToProduct = (fileName: string): { group: ProductGroup | undefined; confidence: "high" | "medium" | "low" | "none" } => {
    const clean = fileName.replace(/\.(jpg|jpeg|png|webp|gif)$/i, "")
      .replace(/[-_]/g, " ").toLowerCase().trim();

    // Try exact match first
    let bestMatch: ProductGroup | undefined;
    let bestScore = 0;

    for (const g of allGroups) {
      const name = g.name.toLowerCase();
      if (clean === name) return { group: g, confidence: "high" };

      // Word matching
      const cleanWords = clean.split(/\s+/);
      const nameWords = name.split(/\s+/);
      const matchedWords = cleanWords.filter(w => nameWords.some(nw => nw.includes(w) || w.includes(nw)));
      const score = matchedWords.length / Math.max(cleanWords.length, nameWords.length);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = g;
      }
    }

    if (bestScore >= 0.7) return { group: bestMatch, confidence: "high" };
    if (bestScore >= 0.4) return { group: bestMatch, confidence: "medium" };
    if (bestScore > 0) return { group: bestMatch, confidence: "low" };
    return { group: undefined, confidence: "none" };
  };

  const handleFiles = (files: File[]) => {
    const newImages: UploadImage[] = files.map(f => ({
      id: crypto.randomUUID(),
      file: f,
      preview: URL.createObjectURL(f),
      status: "pending" as const,
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    handleFiles(files);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    e.target.value = "";
  };

  const runMatching = async () => {
    setProcessing(true);
    const updated = images.map(img => {
      if (img.status !== "pending") return img;
      const { group, confidence } = matchFileToProduct(img.file.name);
      return { ...img, status: "matched" as const, matchedGroup: group, confidence };
    });
    setImages(updated);
    setProcessing(false);
    setStep("review");
  };

  const updateMatch = (imageId: string, groupKey: string) => {
    setImages(prev => prev.map(img => {
      if (img.id !== imageId) return img;
      const group = allGroups.find(g => g.key === groupKey);
      return { ...img, matchedGroup: group, confidence: "high" as const };
    }));
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const handleUploadAll = async () => {
    const matched = images.filter(i => i.matchedGroup);
    if (matched.length === 0) { toast({ title: "No matched images to upload", variant: "destructive" }); return; }

    setUploading(true);
    let successCount = 0;

    for (let i = 0; i < matched.length; i++) {
      const img = matched[i];
      setProgress(Math.round(((i + 1) / matched.length) * 100));
      try {
        const blob = await processProductImage(img.file, () => {});
        const ext = blob.type === "image/webp" ? "webp" : "jpg";
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
        await supabase.storage.from("store-images").upload(`products/${fileName}`, blob, { contentType: blob.type || "image/jpeg" });
        const { data: { publicUrl } } = supabase.storage.from("store-images").getPublicUrl(`products/${fileName}`);
        const ids = img.matchedGroup!.products.map(p => p.id);
        await supabase.from("products").update({ image_url: publicUrl }).in("id", ids);
        setImages(prev => prev.map(im => im.id === img.id ? { ...im, status: "uploaded" as const } : im));
        successCount++;
      } catch (err: any) {
        setImages(prev => prev.map(im => im.id === img.id ? { ...im, status: "error" as const, error: err.message } : im));
      }
    }

    toast({ title: "Upload complete", description: `${successCount} of ${matched.length} image(s) uploaded` });
    setUploading(false);
    setStep("done");
    onRefresh();
  };

  const handleClose = () => {
    images.forEach(i => URL.revokeObjectURL(i.preview));
    setImages([]);
    setStep("upload");
    setProgress(0);
    onClose();
  };

  const matchedCount = images.filter(i => i.matchedGroup).length;
  const unmatchedCount = images.filter(i => !i.matchedGroup && i.status === "matched").length;
  const uploadedCount = images.filter(i => i.status === "uploaded").length;

  const confBadge = (c: string | undefined) => {
    switch (c) {
      case "high": return <Badge className="text-[10px] h-5 bg-emerald-500/10 text-emerald-600 border-emerald-200">High</Badge>;
      case "medium": return <Badge className="text-[10px] h-5 bg-amber-500/10 text-amber-600 border-amber-200">Medium</Badge>;
      case "low": return <Badge className="text-[10px] h-5 bg-orange-500/10 text-orange-600 border-orange-200">Low</Badge>;
      default: return <Badge variant="secondary" className="text-[10px] h-5">No Match</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5 text-primary" />
            Bulk Image Upload
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload product images — they'll be matched to products automatically"}
            {step === "review" && `Review ${images.length} image(s) — ${matchedCount} matched, ${unmatchedCount} unmatched`}
            {step === "done" && `${uploadedCount} image(s) uploaded successfully`}
          </DialogDescription>
        </DialogHeader>

        <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleInputChange} />

        {step === "upload" && (
          <div className="flex-1 space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-border hover:border-primary/40 rounded-xl p-8 text-center cursor-pointer transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <ImagePlus className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium">Drop images here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP — multiple files supported</p>
            </div>

            {/* Image preview grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-[280px] overflow-y-auto">
                {images.map(img => (
                  <div key={img.id} className="relative aspect-square rounded-lg border border-border/30 overflow-hidden bg-muted/20 group">
                    <img src={img.preview} alt="" className="w-full h-full object-contain p-1" />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-foreground/80 text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <p className="absolute bottom-0 left-0 right-0 bg-foreground/60 text-background text-[8px] px-1 py-0.5 truncate">
                      {img.file.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "review" && (
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[50vh]">
            {images.map(img => (
              <div key={img.id} className="flex items-center gap-3 p-2.5 border border-border/40 rounded-xl hover:border-border/60 transition-colors">
                <div className="h-12 w-12 rounded-lg border border-border/20 overflow-hidden bg-muted/20 flex-shrink-0">
                  <img src={img.preview} alt="" className="w-full h-full object-contain p-0.5" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs text-muted-foreground truncate">{img.file.name}</p>
                  <div className="flex items-center gap-2">
                    {confBadge(img.confidence)}
                    {img.status === "uploaded" && (
                      <Badge className="text-[10px] h-5 bg-emerald-500/10 text-emerald-600 border-emerald-200">
                        <Check className="h-2.5 w-2.5 mr-0.5" />Uploaded
                      </Badge>
                    )}
                    {img.status === "error" && (
                      <Badge variant="destructive" className="text-[10px] h-5">{img.error || "Error"}</Badge>
                    )}
                  </div>
                </div>
                <div className="w-[200px] flex-shrink-0">
                  <Select
                    value={img.matchedGroup?.key || "none"}
                    onValueChange={(v) => updateMatch(img.id, v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select product..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      <SelectItem value="none">No match</SelectItem>
                      {allGroups.map(g => (
                        <SelectItem key={g.key} value={g.key}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}

        {step === "done" && (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <Check className="h-7 w-7 text-emerald-500" />
            </div>
            <p className="text-lg font-semibold">{uploadedCount} image(s) uploaded</p>
            <p className="text-sm text-muted-foreground mt-1">
              {images.filter(i => i.status === "error").length > 0
                ? `${images.filter(i => i.status === "error").length} failed`
                : "All images processed successfully"
              }
            </p>
          </div>
        )}

        {uploading && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">Processing images... {progress}%</p>
          </div>
        )}

        <DialogFooter className="flex-shrink-0">
          {step === "upload" && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={runMatching} disabled={images.length === 0 || processing}>
                {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Matching...</> : <>Match Products ({images.length})</>}
              </Button>
            </>
          )}
          {step === "review" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
              <Button onClick={handleUploadAll} disabled={uploading || matchedCount === 0}>
                {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : <>Upload {matchedCount} Matched</>}
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkImageUploadModal;
