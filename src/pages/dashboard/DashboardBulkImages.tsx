import { useState, useCallback } from "react";
import { Upload, Loader2, Check, X, ImagePlus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [fileHashes, setFileHashes] = useState<Set<string>>(new Set());

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase.from("products").select("id, name, category, store_id").order("name");
    if (data) setProducts(data);
  }, []);

  const computeFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (products.length === 0) await fetchProducts();

    const newImages: UploadedImage[] = [];
    const updatedHashes = new Set(fileHashes);
    let duplicateCount = 0;

    for (const file of files) {
      const hash = await computeFileHash(file);
      if (updatedHashes.has(hash)) {
        duplicateCount++;
        continue;
      }
      updatedHashes.add(hash);
      newImages.push({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        status: "pending",
      });
    }

    setFileHashes(updatedHashes);
    if (newImages.length > 0) setImages((prev) => [...prev, ...newImages]);

    if (duplicateCount > 0) {
      toast({
        title: "Duplicates removed",
        description: `${duplicateCount} duplicate image(s) were automatically skipped`,
      });
    }
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const identifyAll = async () => {
    setProcessing(true);
    const uniqueProducts = Array.from(
      new Map(products.map((p) => [p.name, { name: p.name, category: p.category }])).values()
    );

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (img.status !== "pending") continue;

      setImages((prev) => prev.map((im) => (im.id === img.id ? { ...im, status: "identifying" } : im)));

      try {
        const base64 = await fileToBase64(img.file);
        const { data, error } = await supabase.functions.invoke("identify-product", {
          body: { imageBase64: base64, existingProducts: uniqueProducts },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        setImages((prev) =>
          prev.map((im) => (im.id === img.id ? { ...im, status: "identified", result: data } : im))
        );
      } catch (err: any) {
        setImages((prev) =>
          prev.map((im) => (im.id === img.id ? { ...im, status: "error", error: err.message } : im))
        );
      }

      // Small delay to avoid rate limits
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
        // Upload image to storage
        const ext = img.file.name.split(".").pop() || "jpg";
        const fileName = `${img.result!.product_name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("store-images")
          .upload(`products/${fileName}`, img.file, { contentType: img.file.type });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("store-images").getPublicUrl(`products/${fileName}`);
        const publicUrl = urlData.publicUrl;

        if (img.result!.is_existing) {
          // Update existing products matching this name
          const matchingProducts = products.filter(
            (p) => p.name.toLowerCase() === img.result!.product_name.toLowerCase()
          );
          if (matchingProducts.length > 0) {
            const { error } = await supabase
              .from("products")
              .update({ image_url: publicUrl })
              .in("id", matchingProducts.map((p) => p.id));
            if (error) throw error;
          }
        } else {
          // Create new product across all stores
          const storeIds = [...new Set(products.map((p) => p.store_id))];
          const newProducts = storeIds.map((storeId) => ({
            name: img.result!.product_name,
            category: img.result!.category as "beer" | "wine" | "spirits" | "smokes",
            price: 0,
            store_id: storeId,
            image_url: publicUrl,
            in_stock: true,
          }));
          const { error } = await supabase.from("products").insert(newProducts);
          if (error) throw error;
        }

        setImages((prev) => prev.map((im) => (im.id === img.id ? { ...im, status: "assigned" } : im)));
        successCount++;
      } catch (err: any) {
        setImages((prev) =>
          prev.map((im) => (im.id === img.id ? { ...im, status: "error", error: err.message } : im))
        );
      }
    }

    toast({
      title: "Done",
      description: `${successCount} image(s) assigned successfully`,
    });
    setAssigning(false);
    fetchProducts();
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== id);
    });
  };

  const clearAll = () => {
    images.forEach((i) => URL.revokeObjectURL(i.preview));
    setImages([]);
  };

  const pendingCount = images.filter((i) => i.status === "pending").length;
  const identifiedCount = images.filter((i) => i.status === "identified").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Bulk Image Upload</h2>
          <p className="text-sm text-muted-foreground">
            Upload product images — AI will identify and assign them to listings
          </p>
        </div>
        {images.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearAll}>
            Clear All
          </Button>
        )}
      </div>

      {/* Upload Area */}
      <Card>
        <CardContent className="pt-6">
          <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
            <ImagePlus className="h-10 w-10 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Click to upload product images</span>
            <span className="text-xs text-muted-foreground mt-1">JPG, PNG — multiple files supported</span>
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFilesSelected}
            />
          </label>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {images.length > 0 && (
        <div className="flex gap-3">
          {pendingCount > 0 && (
            <Button onClick={identifyAll} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Identifying...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Identify All ({pendingCount})
                </>
              )}
            </Button>
          )}
          {identifiedCount > 0 && (
            <Button onClick={assignImages} disabled={assigning} variant="default">
              {assigning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Assign All ({identifiedCount})
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img) => (
            <Card key={img.id} className="overflow-hidden">
              <div className="relative aspect-square bg-muted">
                <img
                  src={img.preview}
                  alt="Upload"
                  className="w-full h-full object-contain"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => removeImage(img.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
                {img.status === "identifying" && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              <CardContent className="p-3 space-y-1">
                {img.status === "pending" && (
                  <Badge variant="secondary" className="text-xs">Pending</Badge>
                )}
                {img.status === "identifying" && (
                  <Badge variant="secondary" className="text-xs">Identifying...</Badge>
                )}
                {img.status === "identified" && img.result && (
                  <>
                    <p className="font-medium text-sm truncate">{img.result.product_name}</p>
                    <div className="flex gap-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">{img.result.category}</Badge>
                      {img.result.size && <Badge variant="outline" className="text-xs">{img.result.size}</Badge>}
                      <Badge
                        variant={img.result.is_existing ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {img.result.is_existing ? "Existing" : "New"}
                      </Badge>
                      <Badge
                        variant={img.result.confidence === "high" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {img.result.confidence}
                      </Badge>
                    </div>
                  </>
                )}
                {img.status === "assigned" && (
                  <Badge className="text-xs bg-green-600">
                    <Check className="h-3 w-3 mr-1" /> Assigned
                  </Badge>
                )}
                {img.status === "error" && (
                  <Badge variant="destructive" className="text-xs">{img.error || "Error"}</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardBulkImages;
