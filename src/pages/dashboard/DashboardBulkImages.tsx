import { useState, useCallback } from "react";
import { Upload, Loader2, Check, X, ImagePlus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "identifying" | "identified" | "assigned" | "error";
  result?: {
    product_name: string;
    category: string;
    size?: string;
    is_existing: boolean;
    confidence: string;
  };
  error?: string;
  selectedProductId?: string;
}

interface ExistingProduct {
  id: string;
  name: string;
  category: string;
  store_id: string;
}

const DashboardBulkImages = () => {
  const { toast } = useToast();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [products, setProducts] = useState<ExistingProduct[]>([]);
  const [processing, setProcessing] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase.from("products").select("id, name, category, store_id").order("name");
    if (data) setProducts(data);
  }, []);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (products.length === 0) await fetchProducts();

    const newImages: UploadedImage[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      status: "pending" as const,
    }));

    setImages((prev) => [...prev, ...newImages]);
    e.target.value = "";
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const identifyAll = async () => {
    setProcessing(true);
    const uniqueProducts = Array.from(new Map(products.map((p) => [p.name, { name: p.name, category: p.category }])).values());
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (img.status !== "pending") continue;
      setImages((prev) => prev.map((im) => (im.id === img.id ? { ...im, status: "identifying" } : im)));
      try {
        const base64 = await fileToBase64(img.file);
        const { data, error } = await supabase.functions.invoke("identify-product", { body: { imageBase64: base64, existingProducts: uniqueProducts } });
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        setImages((prev) => prev.map((im) => (im.id === img.id ? { ...im, status: "identified", result: data } : im)));
      } catch (err: any) {
        setImages((prev) => prev.map((im) => (im.id === img.id ? { ...im, status: "error", error: err.message } : im)));
      }
      if (i < images.length - 1) await new Promise((r) => setTimeout(r, 1500));
    }
    setProcessing(false);
  };

  const assignImages = async () => {
    setAssigning(true);
    const identified = images.filter((i) => i.status === "identified" && i.result);
    let successCount = 0;
    for (const img of identified) {
      try {
        const ext = img.file.name.split(".").pop() || "jpg";
        const fileName = `${img.result!.product_name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("store-images").upload(`products/${fileName}`, img.file, { contentType: img.file.type });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("store-images").getPublicUrl(`products/${fileName}`);
        if (img.result!.is_existing) {
          const matching = products.filter((p) => p.name.toLowerCase() === img.result!.product_name.toLowerCase());
          if (matching.length > 0) {
            const { error } = await supabase.from("products").update({ image_url: urlData.publicUrl }).in("id", matching.map((p) => p.id));
            if (error) throw error;
          }
        } else {
          const storeIds = [...new Set(products.map((p) => p.store_id))];
          const newProducts = storeIds.map((storeId) => ({
            name: img.result!.product_name, category: img.result!.category as "beer" | "wine" | "spirits" | "smokes",
            price: 0, store_id: storeId, image_url: urlData.publicUrl, in_stock: true,
          }));
          const { error } = await supabase.from("products").insert(newProducts);
          if (error) throw error;
        }
        setImages((prev) => prev.map((im) => (im.id === img.id ? { ...im, status: "assigned" } : im)));
        successCount++;
      } catch (err: any) {
        setImages((prev) => prev.map((im) => (im.id === img.id ? { ...im, status: "error", error: err.message } : im)));
      }
    }
    toast({ title: "Done", description: `${successCount} image(s) assigned successfully` });
    setAssigning(false);
    fetchProducts();
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const toRemove = prev.find((i) => i.id === id);
      if (toRemove) URL.revokeObjectURL(toRemove.preview);
      const next = prev.filter((i) => i.id !== id);
      exactHashesRef.current = new Set(next.map((i) => i.exactHash).filter(Boolean) as string[]);
      perceptualHashesRef.current = next.map((i) => i.perceptualHash).filter(Boolean) as string[];
      return next;
    });
  };

  const clearAll = () => {
    images.forEach((i) => URL.revokeObjectURL(i.preview));
    setImages([]);
    exactHashesRef.current = new Set();
    perceptualHashesRef.current = [];
  };

  const pendingCount = images.filter((i) => i.status === "pending").length;
  const identifiedCount = images.filter((i) => i.status === "identified").length;

  const statusBadge = (img: UploadedImage) => {
    switch (img.status) {
      case "pending": return <Badge variant="secondary" className="text-[10px]">Pending</Badge>;
      case "identifying": return <Badge variant="secondary" className="text-[10px] animate-pulse">Identifying...</Badge>;
      case "identified": return (
        <div className="space-y-1">
          <p className="font-medium text-xs truncate">{img.result?.product_name}</p>
          <div className="flex gap-1 flex-wrap">
            <Badge variant="outline" className="text-[10px] h-4">{img.result?.category}</Badge>
            {img.result?.size && <Badge variant="outline" className="text-[10px] h-4">{img.result.size}</Badge>}
            <Badge variant={img.result?.is_existing ? "default" : "secondary"} className="text-[10px] h-4">
              {img.result?.is_existing ? "Match" : "New"}
            </Badge>
          </div>
        </div>
      );
      case "assigned": return <Badge className="text-[10px] bg-emerald-600 border-0"><Check className="h-3 w-3 mr-1" />Assigned</Badge>;
      case "error": return <Badge variant="destructive" className="text-[10px]">{img.error || "Error"}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Bulk Image Upload</h2>
          <p className="text-sm text-muted-foreground mt-1">Upload product images — AI identifies and assigns them</p>
        </div>
        {images.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearAll} className="rounded-xl">
            <Trash2 className="h-3.5 w-3.5 mr-2" />Clear All
          </Button>
        )}
      </div>

      {/* Upload Area */}
      <Card className="border-dashed border-2 border-border hover:border-primary/40 transition-colors">
        <CardContent className="pt-6">
          <label className="flex flex-col items-center justify-center h-36 cursor-pointer">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              <ImagePlus className="h-7 w-7 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Drop images or click to upload</span>
            <span className="text-xs text-muted-foreground mt-1">JPG, PNG — multiple files supported</span>
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFilesSelected} />
          </label>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {images.length > 0 && (
        <div className="flex gap-3">
          {pendingCount > 0 && (
            <Button onClick={identifyAll} disabled={processing} className="rounded-xl">
              {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Identifying...</> : <><Upload className="h-4 w-4 mr-2" />Identify All ({pendingCount})</>}
            </Button>
          )}
          {identifiedCount > 0 && (
            <Button onClick={assignImages} disabled={assigning} className="rounded-xl">
              {assigning ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Assigning...</> : <><Check className="h-4 w-4 mr-2" />Assign All ({identifiedCount})</>}
            </Button>
          )}
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {images.map((img) => (
            <Card key={img.id} className="overflow-hidden border-border/50 hover:shadow-md transition-shadow">
              <div className="relative aspect-square bg-muted/50">
                <img src={img.preview} alt="Upload" className="w-full h-full object-contain p-2" />
                <Button variant="destructive" size="icon" className="absolute top-1.5 right-1.5 h-6 w-6 rounded-lg" onClick={() => removeImage(img.id)}>
                  <X className="h-3 w-3" />
                </Button>
                {img.status === "identifying" && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                )}
              </div>
              <CardContent className="p-2.5">{statusBadge(img)}</CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardBulkImages;
