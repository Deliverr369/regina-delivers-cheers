import { useState } from "react";
import { Plus, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";

interface ManualItemDialogProps {
  storeId: string;
  storeName: string;
}

const ManualItemDialog = ({ storeId, storeName }: ManualItemDialogProps) => {
  const { addToCart, updateQuantity, cartItems } = useCart();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);

  const reset = () => {
    setName("");
    setSize("");
    setQuantity(1);
  };

  const handleAdd = () => {
    if (!name.trim()) {
      toast({ title: "Product name required", description: "Please enter a product name.", variant: "destructive" });
      return;
    }
    const qty = Math.max(1, Number(quantity) || 1);
    const displayName = size.trim() ? `${name.trim()} (${size.trim()})` : name.trim();
    const id = `manual-${storeId}-${displayName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

    addToCart({
      id,
      name: displayName,
      price: 0,
      image: "",
      storeId,
      storeName,
    });

    if (qty > 1) {
      // Wait for state update then bump quantity
      setTimeout(() => updateQuantity(id, qty), 0);
    }

    toast({
      title: "Added to cart",
      description: `${displayName} × ${qty} added. Final price will be confirmed at checkout.`,
    });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full h-11 gap-2 border-primary/30 hover:bg-primary/5 hover:border-primary text-primary font-semibold whitespace-nowrap">
          <PackagePlus className="h-4 w-4" />
          Add Item Manually
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Add Item Manually</DialogTitle>
          <DialogDescription>
            Can't find what you need at <span className="font-medium text-foreground">{storeName}</span>? Add it manually and our shopper will pick it up. Final price confirmed at checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="manual-name">Product name *</Label>
            <Input
              id="manual-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lay's Classic Chips"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="manual-size">Size</Label>
              <Input
                id="manual-size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g. 200g, 750ml"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-qty">Quantity</Label>
              <Input
                id="manual-qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManualItemDialog;
