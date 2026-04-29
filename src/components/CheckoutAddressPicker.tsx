import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, Star, Check, Loader2 } from "lucide-react";
import { useAddresses, type SavedAddress, type AddressInput } from "@/hooks/useAddresses";
import AddressFormDialog from "./AddressFormDialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface Props {
  selectedId: string | null;
  onSelect: (addr: SavedAddress) => void;
}

const CheckoutAddressPicker = ({ selectedId, onSelect }: Props) => {
  const { addresses, loading, create } = useAddresses();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [autoSelected, setAutoSelected] = useState(false);

  // Auto-select default (or first) address once loaded
  useEffect(() => {
    if (loading || autoSelected || addresses.length === 0 || selectedId) return;
    const def = addresses.find((a) => a.is_default) || addresses[0];
    if (def) {
      onSelect(def);
      setAutoSelected(true);
    }
  }, [loading, addresses, selectedId, onSelect, autoSelected]);

  const handleCreate = async (data: AddressInput) => {
    try {
      const created = await create(data);
      onSelect(created);
      toast({ title: "Address added" });
    } catch (err: any) {
      toast({
        title: "Could not save address",
        description: err.message,
        variant: "destructive",
      });
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading your addresses...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {addresses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-center">
          <MapPin className="h-7 w-7 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            No saved addresses yet — add one to continue.
          </p>
        </div>
      ) : (
        addresses.map((addr) => {
          const selected = selectedId === addr.id;
          return (
            <button
              key={addr.id}
              type="button"
              onClick={() => onSelect(addr)}
              className={`w-full flex items-start gap-3 rounded-xl border p-3.5 transition-all text-left ${
                selected
                  ? "border-primary bg-primary/[0.04] shadow-sm shadow-primary/10"
                  : "border-border bg-background hover:border-primary/40"
              }`}
            >
              <div
                className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                  selected ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                }`}
              >
                <MapPin className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">{addr.label}</p>
                  {addr.is_default && (
                    <Badge variant="secondary" className="text-[10px] h-5">
                      <Star className="h-2.5 w-2.5 mr-1 fill-current" /> Default
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {addr.address}
                  {addr.unit ? `, ${addr.unit}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {addr.city}
                  {addr.postal_code ? `, ${addr.postal_code}` : ""}
                </p>
                {addr.delivery_instructions && (
                  <p className="text-[11px] text-muted-foreground/80 mt-1 italic truncate">
                    “{addr.delivery_instructions}”
                  </p>
                )}
              </div>
              {selected && (
                <Check className="h-4 w-4 text-primary mt-1 shrink-0" />
              )}
            </button>
          );
        })
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full rounded-full"
        onClick={() => setDialogOpen(true)}
      >
        <Plus className="h-4 w-4 mr-2" /> Add a new address
      </Button>

      <AddressFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={null}
        onSubmit={handleCreate}
      />
    </div>
  );
};

export default CheckoutAddressPicker;
