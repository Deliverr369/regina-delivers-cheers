import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, ShoppingCart, ArrowRight, ArrowLeft, Check } from "lucide-react";

interface RequestItem {
  name: string;
  size: string;
  quantity: number;
}

interface SuperstoreRequestFormProps {
  storeId: string;
  storeName: string;
}

type Step = "name" | "size" | "quantity" | "review";

const SuperstoreRequestForm = ({ storeId, storeName }: SuperstoreRequestFormProps) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toast } = useToast();

  const [items, setItems] = useState<RequestItem[]>([]);
  const [step, setStep] = useState<Step>("name");
  const [draft, setDraft] = useState<RequestItem>({ name: "", size: "", quantity: 1 });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch all unique product names from the database for autocomplete
  const { data: allProductNames = [] } = useQuery({
    queryKey: ["all-product-names"],
    queryFn: async () => {
      const names = new Set<string>();
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("products")
          .select("name")
          .range(from, from + batchSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        data.forEach((p) => p.name && names.add(p.name));
        if (data.length < batchSize) break;
        from += batchSize;
      }
      return Array.from(names).sort();
    },
    staleTime: 5 * 60 * 1000,
  });

  const suggestions = useMemo(() => {
    const q = draft.name.trim().toLowerCase();
    if (q.length < 2) return [];
    const startsWith: string[] = [];
    const contains: string[] = [];
    for (const name of allProductNames) {
      const lower = name.toLowerCase();
      if (lower.startsWith(q)) startsWith.push(name);
      else if (lower.includes(q)) contains.push(name);
      if (startsWith.length >= 8) break;
    }
    return [...startsWith, ...contains].slice(0, 8);
  }, [draft.name, allProductNames]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pickSuggestion = (name: string) => {
    setDraft((d) => ({ ...d, name }));
    setShowSuggestions(false);
  };

  const resetDraft = () => setDraft({ name: "", size: "", quantity: 1 });

  const handleNext = () => {
    if (step === "name") {
      if (!draft.name.trim()) {
        toast({ title: "Item required", description: "Please enter the liquor item name", variant: "destructive" });
        return;
      }
      setStep("size");
    } else if (step === "size") {
      if (!draft.size.trim()) {
        toast({ title: "Size required", description: "Please enter the size (e.g. 750ml, 24-pack)", variant: "destructive" });
        return;
      }
      setStep("quantity");
    } else if (step === "quantity") {
      if (!draft.quantity || draft.quantity < 1) {
        toast({ title: "Quantity required", description: "Quantity must be at least 1", variant: "destructive" });
        return;
      }
      setItems((prev) => [...prev, { ...draft, name: draft.name.trim(), size: draft.size.trim() }]);
      setStep("review");
      resetDraft();
    }
  };

  const handleBack = () => {
    if (step === "size") setStep("name");
    else if (step === "quantity") setStep("size");
    else if (step === "review") setStep("name");
  };

  const addAnother = () => {
    resetDraft();
    setStep("name");
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    if (items.length === 1) {
      setStep("name");
    }
  };

  const handleSubmit = () => {
    if (items.length === 0) {
      toast({ title: "No items", description: "Please add at least one item", variant: "destructive" });
      return;
    }
    items.forEach((item, idx) => {
      const displayName = `${item.name} (${item.size})`;
      // Add `quantity` times so cart reflects the count
      for (let i = 0; i < item.quantity; i++) {
        addToCart({
          id: `request-${Date.now()}-${idx}-${i}`,
          name: displayName,
          price: 0, // Admin will confirm final price after fulfillment
          image: "",
          storeId,
          storeName,
        });
      }
    });
    toast({
      title: "Request added to cart",
      description: "Final pricing will be confirmed by our team after we pick up your order.",
    });
    navigate("/cart");
  };

  const stepNumber = step === "name" ? 1 : step === "size" ? 2 : step === "quantity" ? 3 : 4;

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-6 md:p-8 border-border/50 shadow-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-3">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">Custom Liquor Request</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tell us what you'd like from {storeName}. We'll pick it up and confirm the final price.
          </p>
        </div>

        {/* Progress dots */}
        {step !== "review" && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-2 rounded-full transition-all ${
                  n === stepNumber ? "w-8 bg-primary" : n < stepNumber ? "w-2 bg-primary" : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>
        )}

        {/* Step: Name */}
        {step === "name" && (
          <div className="space-y-3">
            <Label htmlFor="item-name" className="text-base font-semibold">
              What liquor item do you want from {storeName}?
            </Label>
            <div className="relative" ref={suggestionsRef}>
              <Input
                id="item-name"
                autoFocus
                value={draft.name}
                onChange={(e) => {
                  setDraft({ ...draft, name: e.target.value });
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (showSuggestions && suggestions.length > 0) {
                      pickSuggestion(suggestions[0]);
                    } else {
                      handleNext();
                    }
                  } else if (e.key === "Escape") {
                    setShowSuggestions(false);
                  }
                }}
                placeholder="e.g. Crown Royal, Bud Light, Yellow Tail Shiraz"
                className="h-12 text-base"
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-72 overflow-y-auto">
                  {suggestions.map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => pickSuggestion(s)}
                      className="w-full text-left px-4 py-2.5 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border/50 last:border-b-0"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Start typing — we'll suggest matching products from our catalog.</p>
          </div>
        )}

        {/* Step: Size */}
        {step === "size" && (
          <div className="space-y-3">
            <Label htmlFor="item-size" className="text-base font-semibold">
              What size? <span className="text-muted-foreground font-normal">({draft.name})</span>
            </Label>
            <Input
              id="item-size"
              autoFocus
              value={draft.size}
              onChange={(e) => setDraft({ ...draft, size: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleNext()}
              placeholder="e.g. 750ml, 1.14L, 24-pack, 6-pack tall cans"
              className="h-12 text-base"
            />
            <p className="text-xs text-muted-foreground">Bottle volume or pack size — whatever applies.</p>
          </div>
        )}

        {/* Step: Quantity */}
        {step === "quantity" && (
          <div className="space-y-3">
            <Label htmlFor="item-qty" className="text-base font-semibold">
              How many? <span className="text-muted-foreground font-normal">({draft.name} — {draft.size})</span>
            </Label>
            <Input
              id="item-qty"
              autoFocus
              type="number"
              min={1}
              value={draft.quantity}
              onChange={(e) => setDraft({ ...draft, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              onKeyDown={(e) => e.key === "Enter" && handleNext()}
              className="h-12 text-base"
            />
          </div>
        )}

        {/* Step: Review */}
        {step === "review" && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-3">Your Request ({items.length} {items.length === 1 ? "item" : "items"})</h3>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.size} · Qty {item.quantity}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3">
              <p className="text-xs text-amber-900 dark:text-amber-200">
                <strong>Pricing note:</strong> Final price will be confirmed by our team after we pick up your order from {storeName}.
              </p>
            </div>

            <Button onClick={addAnother} variant="outline" className="w-full h-11">
              <Plus className="h-4 w-4 mr-1" /> Add another item
            </Button>

            <Button onClick={handleSubmit} className="w-full h-12 text-base font-semibold">
              <Check className="h-5 w-5 mr-1" /> Submit Order
            </Button>
          </div>
        )}

        {/* Nav buttons for entry steps */}
        {step !== "review" && (
          <div className="flex items-center gap-2 mt-6">
            {(step !== "name" || items.length > 0) && (
              <Button variant="outline" onClick={step === "name" ? () => setStep("review") : handleBack} className="flex-1 h-11">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            <Button onClick={handleNext} className="flex-1 h-11">
              {step === "quantity" ? "Add to Order" : "Next"} <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SuperstoreRequestForm;
