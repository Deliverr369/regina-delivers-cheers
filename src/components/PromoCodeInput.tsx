import { useState } from "react";
import { Tag, X, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart, type AppliedPromo } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";

const PromoCodeInput = () => {
  const { appliedPromo, applyPromo, removePromo, getCartTotal, getDiscountAmount } = useCart();
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const discountAmount = getDiscountAmount();

  const handleApply = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setSubmitting(true);

    const { data, error } = await supabase
      .from("promo_codes")
      .select("id, code, description, discount_type, discount_value, min_order_amount, max_uses, use_count, expires_at, is_active")
      .ilike("code", trimmed)
      .maybeSingle();

    setSubmitting(false);

    if (error || !data) {
      haptics.warning();
      toast.error("Invalid code", { description: "That promo code doesn't exist." });
      return;
    }
    if (!data.is_active) {
      toast.error("This code is no longer active.");
      return;
    }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      toast.error("This code has expired.");
      return;
    }
    if (data.max_uses != null && data.use_count >= data.max_uses) {
      toast.error("This code has reached its usage limit.");
      return;
    }
    const subtotal = getCartTotal();
    if (subtotal < Number(data.min_order_amount)) {
      toast.error(`Minimum order $${Number(data.min_order_amount).toFixed(2)} required for this code.`);
      return;
    }

    const promo: AppliedPromo = {
      code: data.code,
      description: data.description,
      discount_type: data.discount_type as "percentage" | "fixed",
      discount_value: Number(data.discount_value),
      min_order_amount: Number(data.min_order_amount),
      promo_code_id: data.id,
    };
    applyPromo(promo);
    haptics.success();
    toast.success(`Code "${data.code}" applied!`, {
      description: data.description ?? undefined,
    });
    setCode("");
    setOpen(false);
  };

  if (appliedPromo) {
    return (
      <div className="flex items-center justify-between gap-3 bg-success/10 border border-success/30 rounded-xl px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">
              {appliedPromo.code}
              <span className="ml-2 text-xs font-normal text-success">
                −${discountAmount.toFixed(2)}
              </span>
            </p>
            {appliedPromo.description && (
              <p className="text-[11px] text-muted-foreground truncate">{appliedPromo.description}</p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
          onClick={() => {
            removePromo();
            toast("Promo code removed");
          }}
          aria-label="Remove promo code"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
      >
        <Tag className="h-4 w-4" />
        Have a promo code?
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Enter code"
        className="h-9 uppercase"
        autoFocus
        onKeyDown={(e) => e.key === "Enter" && handleApply()}
      />
      <Button onClick={handleApply} size="sm" disabled={submitting || !code.trim()} className="h-9 rounded-full">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen(false);
          setCode("");
        }}
        className="h-9"
      >
        Cancel
      </Button>
    </div>
  );
};

export default PromoCodeInput;
