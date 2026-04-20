import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
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
            <Input
              id="item-name"
              autoFocus
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleNext()}
              placeholder="e.g. Crown Royal, Bud Light, Yellow Tail Shiraz"
              className="h-12 text-base"
            />
            <p className="text-xs text-muted-foreground">Type the brand and product name as you'd ask the cashier.</p>
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
