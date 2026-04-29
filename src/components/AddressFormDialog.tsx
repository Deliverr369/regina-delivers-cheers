import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { Loader2 } from "lucide-react";
import type { AddressInput, SavedAddress } from "@/hooks/useAddresses";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: SavedAddress | null;
  onSubmit: (data: AddressInput) => Promise<void>;
}

const empty: AddressInput = {
  label: "Home",
  recipient_name: "",
  phone: "",
  address: "",
  unit: "",
  city: "Regina",
  postal_code: "",
  delivery_instructions: "",
  is_default: false,
};

// Allows e.g. "Apt 3B", "#204", "Suite 1200", "Unit 12", "PH 4". 1–15 alphanumerics + #.-/ space.
const UNIT_RE = /^[A-Za-z0-9#.\-/ ]{1,15}$/;

const AddressFormDialog = ({ open, onOpenChange, initial, onSubmit }: Props) => {
  const [form, setForm] = useState<AddressInput>(empty);
  const [cityError, setCityError] = useState<string | null>(null);
  const [unitError, setUnitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              label: initial.label,
              recipient_name: initial.recipient_name || "",
              phone: initial.phone || "",
              address: initial.address,
              unit: initial.unit || "",
              city: initial.city,
              postal_code: initial.postal_code || "",
              delivery_instructions: initial.delivery_instructions || "",
              is_default: initial.is_default,
            }
          : empty,
      );
      setCityError(null);
      setUnitError(null);
    }
  }, [open, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.city.trim().toLowerCase() !== "regina") {
      setCityError("We only deliver within Regina.");
      return;
    }
    const unitTrimmed = (form.unit || "").trim();
    if (unitTrimmed && !UNIT_RE.test(unitTrimmed)) {
      setUnitError("Use letters, numbers, # . - / only (max 15 chars).");
      return;
    }
    setUnitError(null);
    if (!form.address.trim()) return;
    setSaving(true);
    try {
      await onSubmit({ ...form, unit: unitTrimmed || null });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit address" : "Add a new address"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-sm">Label</Label>
            <Input
              value={form.label}
              onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              placeholder="Home, Work, Mom's place..."
              maxLength={50}
              required
              className="mt-1.5"
            />
          </div>

          <div>
            <Label className="text-sm">Street address</Label>
            <div className="mt-1.5">
              <AddressAutocomplete
                value={form.address}
                onChange={(v) => setForm((p) => ({ ...p, address: v }))}
                onSelect={(addr, isRegina) => {
                  setForm((p) => ({ ...p, address: addr, city: "Regina" }));
                  setCityError(isRegina ? null : "We only deliver within Regina.");
                }}
                error={cityError}
                placeholder="Start typing your Regina address"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">City</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                disabled
                className="mt-1.5 bg-muted"
              />
            </div>
            <div>
              <Label className="text-sm">Postal code</Label>
              <Input
                value={form.postal_code || ""}
                onChange={(e) => setForm((p) => ({ ...p, postal_code: e.target.value }))}
                placeholder="S4X 1A2"
                maxLength={10}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm">Delivery instructions (optional)</Label>
            <Input
              value={form.delivery_instructions || ""}
              onChange={(e) =>
                setForm((p) => ({ ...p, delivery_instructions: e.target.value }))
              }
              placeholder="Buzz #204, leave at door..."
              maxLength={250}
              className="mt-1.5"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Set as default</p>
              <p className="text-xs text-muted-foreground">
                Pre-selected on checkout
              </p>
            </div>
            <Switch
              checked={form.is_default}
              onCheckedChange={(v) => setForm((p) => ({ ...p, is_default: v }))}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !!cityError}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {initial ? "Save changes" : "Add address"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddressFormDialog;
