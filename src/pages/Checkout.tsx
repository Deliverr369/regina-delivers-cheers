import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, CreditCard, Clock, CheckCircle, AlertCircle, ShieldCheck, Loader2, User, Heart, Lock, Sparkles, Plus, Check, Banknote } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const stripePromise = loadStripe(import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string);

const BUFFER_PCT = 0.3; // +30% pre-authorization buffer

const getDeliveryFee = (storeName: string) => {
  const n = (storeName || "").toLowerCase();
  if (n.includes("costco")) return 20;
  if (n.includes("superstore")) return 15;
  return 7;
};

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  deliveryInstructions: string;
}

interface PaymentFormProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  cityError: string | null;
  setCityError: (v: string | null) => void;
  estimatedTotal: number;
  authorizedAmount: number;
  isSubmitting: boolean;
  setIsSubmitting: (v: boolean) => void;
  setError: (v: string | null) => void;
  paymentIntentId: string;
  onSuccess: () => Promise<void>;
}

interface SavedCard {
  id: string;
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
}

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, getCartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string>("");
  const [authorizedAmount, setAuthorizedAmount] = useState<number>(0);
  const [initLoading, setInitLoading] = useState(true);

  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | "new">("new");
  const [paymentMode, setPaymentMode] = useState<"card" | "cod">("card");

  const subtotal = getCartTotal();
  const storeName = cartItems[0]?.storeName || "";
  // Charge delivery fee per unique store
  const uniqueStores = Array.from(
    new Map(cartItems.map((i) => [i.storeId, i.storeName])).entries()
  );
  const deliveryFee = uniqueStores.reduce((sum, [, name]) => sum + getDeliveryFee(name), 0);
  const convenienceFee = subtotal * 0.12;
  const tax = subtotal * 0.11;

  const [tipPreset, setTipPreset] = useState<number | "custom" | null>(3);
  const [customTip, setCustomTip] = useState<string>("");
  const tip = useMemo(() => {
    if (tipPreset === "custom") {
      const n = parseFloat(customTip);
      return isNaN(n) || n < 0 ? 0 : n;
    }
    return tipPreset ?? 0;
  }, [tipPreset, customTip]);

  const estimatedTotal = subtotal + deliveryFee + convenienceFee + tax + tip;

  const [formData, setFormData] = useState<FormData>(() => {
    const savedAddress = typeof window !== "undefined" ? localStorage.getItem("delivery_address") || "" : "";
    return {
      firstName: "", lastName: "", email: user?.email || "", phone: "",
      address: savedAddress, city: "Regina", postalCode: "", deliveryInstructions: "",
    };
  });
  const [cityError, setCityError] = useState<string | null>(null);

  // Auto-fill from saved profile on login
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, address, city, postal_code, email")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile) return;
      const [firstName = "", ...rest] = (profile.full_name || "").split(" ");
      const lastName = rest.join(" ");
      setFormData((prev) => ({
        ...prev,
        firstName: prev.firstName || firstName,
        lastName: prev.lastName || lastName,
        email: prev.email || profile.email || user.email || "",
        phone: prev.phone || profile.phone || "",
        address: prev.address || profile.address || "",
        city: prev.city || profile.city || "Regina",
        postalCode: prev.postalCode || profile.postal_code || "",
      }));
    })();
  }, [user]);

  // Fetch saved cards once
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("list-payment-methods", { body: {} });
        const cards: SavedCard[] = data?.payment_methods || [];
        setSavedCards(cards);
        if (cards.length > 0) setSelectedCardId(cards[0].id);
      } catch (err) {
        console.warn("Failed to load saved cards", err);
      }
    })();
  }, [user]);

  // Create PaymentIntent whenever total or selected card changes (skip for COD)
  useEffect(() => {
    if (!user || cartItems.length === 0) return;
    if (paymentMode === "cod") {
      setClientSecret(null);
      setPaymentIntentId("");
      setAuthorizedAmount(0);
      setInitLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setInitLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("create-payment-intent", {
          body: {
            estimated_total: estimatedTotal,
            payment_method_id: selectedCardId !== "new" ? selectedCardId : undefined,
          },
        });
        if (cancelled) return;
        if (error) throw error;
        setClientSecret(data.client_secret);
        setPaymentIntentId(data.payment_intent_id);
        setAuthorizedAmount(data.authorized_amount);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Could not initialize payment");
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cartItems.length, estimatedTotal, selectedCardId, paymentMode]);

  const handleSuccess = async () => {
    if (!user) return;
    try {
      const storeId = cartItems[0]?.storeId;
      const isCod = paymentMode === "cod";
      const { data: order, error: orderError } = await supabase.from("orders").insert({
        user_id: user.id,
        store_id: storeId || null,
        subtotal,
        delivery_fee: deliveryFee,
        tax,
        total: estimatedTotal,
        estimated_subtotal: subtotal,
        estimated_total: estimatedTotal,
        authorized_amount: isCod ? 0 : authorizedAmount,
        convenience_fee: convenienceFee,
        stripe_payment_intent_id: isCod ? null : paymentIntentId,
        payment_status: isCod ? "pending" : "authorized",
        delivery_address: formData.address,
        delivery_city: formData.city,
        delivery_postal_code: formData.postalCode,
        delivery_instructions: formData.deliveryInstructions,
        payment_method: isCod ? "cod" : "card",
        status: "pending",
      }).select().single();
      if (orderError) throw orderError;

      const orderItems = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price,
        estimated_price: item.price,
      }));
      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      await supabase.from("profiles").update({
        full_name: `${formData.firstName} ${formData.lastName}`,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        postal_code: formData.postalCode,
      }).eq("id", user.id);

      clearCart();
      toast({
        title: "Order placed!",
        description: isCod
          ? "Cash on delivery — please have exact amount ready."
          : "Card authorized — final amount confirmed by your store.",
      });
      navigate("/order-confirmation");
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  const elementsOptions = useMemo(
    () => clientSecret ? { clientSecret, appearance: { theme: "stripe" as const } } : undefined,
    [clientSecret],
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 text-center py-20">
            <h1 className="font-display text-2xl font-bold mb-4">Please log in to checkout</h1>
            <Link to="/login"><Button className="rounded-full">Log In</Button></Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (cartItems.length === 0) { navigate("/cart"); return null; }

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background">
      <Header />
      <main className="pt-20 pb-20">
        {/* Page header */}
        <div className="container mx-auto px-4 pt-8 pb-6">
          <Link
            to="/cart"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to cart
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Checkout
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                Secure, encrypted payment · Powered by Stripe
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-success" />
              256-bit SSL encryption
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4">
          {error && (
            <Alert variant="destructive" className="mb-6 rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {(() => {
            const bodyProps = {
              formData,
              setFormData,
              cityError,
              setCityError,
              cartItems,
              subtotal,
              deliveryFee,
              storeBreakdown: uniqueStores.map(([id, name]) => ({ id: id as string, name: name as string, fee: getDeliveryFee(name as string) })),
              convenienceFee,
              tax,
              tip,
              tipPreset,
              setTipPreset,
              customTip,
              setCustomTip,
              estimatedTotal,
              authorizedAmount,
              isSubmitting,
              setIsSubmitting,
              setError,
              paymentIntentId,
              onSuccess: handleSuccess,
              savedCards,
              selectedCardId,
              setSelectedCardId,
              clientSecret: clientSecret || "",
              paymentMode,
              setPaymentMode,
            };

            if (paymentMode === "cod") {
              return <CheckoutBody {...bodyProps} />;
            }
            if (initLoading) {
              return (
                <div className="flex items-center justify-center py-32 gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" /> Preparing secure payment...
                </div>
              );
            }
            if (clientSecret && elementsOptions) {
              return (
                <Elements stripe={stripePromise} options={elementsOptions} key={clientSecret}>
                  <CheckoutBody {...bodyProps} />
                </Elements>
              );
            }
            return (
              <Alert variant="destructive" className="rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Could not initialize payment. Please refresh.</AlertDescription>
              </Alert>
            );
          })()}
        </div>
      </main>
      <Footer />
    </div>
  );
};

interface CheckoutBodyProps extends PaymentFormProps {
  cartItems: any[];
  subtotal: number;
  deliveryFee: number;
  storeBreakdown: { id: string; name: string; fee: number }[];
  convenienceFee: number;
  tax: number;
  tip: number;
  tipPreset: number | "custom" | null;
  setTipPreset: (v: number | "custom" | null) => void;
  customTip: string;
  setCustomTip: (v: string) => void;
  savedCards: SavedCard[];
  selectedCardId: string | "new";
  setSelectedCardId: (v: string | "new") => void;
  clientSecret: string;
  paymentMode: "card" | "cod";
  setPaymentMode: (v: "card" | "cod") => void;
}

const CheckoutBody = (props: CheckoutBodyProps) => {
  const stripe = useStripe();
  const elements = useElements();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    props.setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "city") {
      props.setCityError(value.trim().toLowerCase() !== "regina" ? "We only deliver within Regina." : null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe) return;
    if (props.formData.city.trim().toLowerCase() !== "regina") {
      props.setCityError("We only deliver within Regina.");
      return;
    }
    props.setIsSubmitting(true);
    props.setError(null);

    const usingSavedCard = props.selectedCardId !== "new";

    if (usingSavedCard) {
      // PaymentIntent was created with the saved payment_method already attached.
      // Confirm it directly using the client secret.
      const result = await stripe.confirmCardPayment(props.clientSecret);
      if (result.error) {
        props.setError(result.error.message || "Payment authorization failed");
        props.setIsSubmitting(false);
        return;
      }
    } else {
      if (!elements) { props.setIsSubmitting(false); return; }
      const { error: stripeError } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.origin + "/order-confirmation" },
        redirect: "if_required",
      });
      if (stripeError) {
        props.setError(stripeError.message || "Payment authorization failed");
        props.setIsSubmitting(false);
        return;
      }
    }
    await props.onSuccess();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
        {/* LEFT: Form */}
        <div className="lg:col-span-3 space-y-5">
          {/* 1. Contact */}
          <SectionCard step={1} icon={<User className="h-4 w-4" />} title="Contact information" subtitle="We'll send your receipt and updates here.">
            <div className="grid sm:grid-cols-2 gap-3">
              <FieldInput label="First name" name="firstName" value={props.formData.firstName} onChange={handleChange} required />
              <FieldInput label="Last name" name="lastName" value={props.formData.lastName} onChange={handleChange} required />
              <FieldInput label="Email" name="email" type="email" value={props.formData.email} onChange={handleChange} required />
              <FieldInput label="Phone" name="phone" type="tel" value={props.formData.phone} onChange={handleChange} required />
            </div>
          </SectionCard>

          {/* 2. Delivery */}
          <SectionCard step={2} icon={<MapPin className="h-4 w-4" />} title="Delivery address" subtitle="We currently deliver within Regina, SK only.">
            <div className="space-y-3">
              <FieldInput label="Street address" name="address" value={props.formData.address} onChange={handleChange} placeholder="123 Main Street" required />
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <FieldInput label="City" name="city" value={props.formData.city} onChange={handleChange} required error={!!props.cityError} />
                  {props.cityError && <p className="text-destructive text-xs mt-1.5 ml-1">{props.cityError}</p>}
                </div>
                <FieldInput label="Postal code" name="postalCode" value={props.formData.postalCode} onChange={handleChange} placeholder="S4X 1A2" required />
              </div>
              <FieldInput label="Delivery instructions (optional)" name="deliveryInstructions" value={props.formData.deliveryInstructions} onChange={handleChange} placeholder="Ring doorbell, leave at door, etc." />
            </div>
          </SectionCard>

          {/* 3. Payment */}
          <SectionCard step={3} icon={<CreditCard className="h-4 w-4" />} title="Payment method" subtitle="Your card is held — never charged more than the final price.">
            <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-3.5 mb-4 flex gap-3">
              <ShieldCheck className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-foreground/80 leading-relaxed">
                <span className="font-semibold text-foreground">Final pricing confirmed by your store.</span> We'll authorize up to{" "}
                <span className="font-semibold text-foreground">${props.authorizedAmount.toFixed(2)}</span> (estimate +30% buffer). Only the actual amount is charged.
              </p>
            </div>

            {props.savedCards.length > 0 && (
              <div className="space-y-2 mb-4">
                {props.savedCards.map((card) => {
                  const selected = props.selectedCardId === card.id;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => props.setSelectedCardId(card.id)}
                      className={`w-full flex items-center gap-3 rounded-xl border p-3.5 transition-all text-left ${
                        selected
                          ? "border-primary bg-primary/[0.04] shadow-sm shadow-primary/10"
                          : "border-border bg-background hover:border-primary/40"
                      }`}
                    >
                      <div className={`h-9 w-12 rounded-md flex items-center justify-center text-[10px] font-bold uppercase ${
                        selected ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                      }`}>
                        {card.brand || "Card"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground capitalize">
                          {card.brand} •••• {card.last4}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Expires {String(card.exp_month).padStart(2, "0")}/{String(card.exp_year).slice(-2)}
                        </p>
                      </div>
                      {selected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => props.setSelectedCardId("new")}
                  className={`w-full flex items-center gap-3 rounded-xl border p-3.5 transition-all text-left ${
                    props.selectedCardId === "new"
                      ? "border-primary bg-primary/[0.04] shadow-sm shadow-primary/10"
                      : "border-dashed border-border bg-background hover:border-primary/40"
                  }`}
                >
                  <div className={`h-9 w-12 rounded-md flex items-center justify-center ${
                    props.selectedCardId === "new" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                  }`}>
                    <Plus className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Use a new card</p>
                    <p className="text-[11px] text-muted-foreground">Saved automatically for next time</p>
                  </div>
                  {props.selectedCardId === "new" && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                </button>
              </div>
            )}

            {props.selectedCardId === "new" && (
              <div className="rounded-xl border border-input bg-background/60 p-4 transition-shadow focus-within:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)] focus-within:border-ring">
                <PaymentElement />
              </div>
            )}
          </SectionCard>

          {/* 4. Tip */}
          <SectionCard step={4} icon={<Heart className="h-4 w-4" />} title="Add a tip for your driver" subtitle="100% of your tip goes directly to the driver.">
            <div className="grid grid-cols-4 gap-2.5">
              {[3, 5, 8].map((amt) => {
                const selected = props.tipPreset === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => props.setTipPreset(amt)}
                    className={`group relative h-14 rounded-xl border font-display font-bold text-base transition-all duration-200 ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]"
                        : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-secondary/60"
                    }`}
                  >
                    ${amt}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => props.setTipPreset("custom")}
                className={`h-14 rounded-xl border font-display font-semibold text-sm transition-all duration-200 ${
                  props.tipPreset === "custom"
                    ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]"
                    : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-secondary/60"
                }`}
              >
                Custom
              </button>
            </div>
            {props.tipPreset === "custom" && (
              <div className="mt-3 animate-fade-in">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.50"
                    value={props.customTip}
                    onChange={(e) => props.setCustomTip(e.target.value)}
                    placeholder="0.00"
                    className="pl-8 h-12 rounded-xl text-base font-medium"
                    autoFocus
                  />
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => props.setTipPreset(null)}
              className={`text-xs mt-3.5 transition-colors ${
                props.tipPreset === null ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              No tip, thanks
            </button>
          </SectionCard>
        </div>

        {/* RIGHT: Order Summary */}
        <div className="lg:col-span-2">
          <div className="sticky top-24">
            <div className="relative rounded-2xl bg-card/95 backdrop-blur-xl border border-border/70 shadow-xl shadow-foreground/[0.04] overflow-hidden">
              {/* Top accent */}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/40" />

              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-display text-lg font-bold text-foreground">Order summary</h2>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                    {props.cartItems.length} item{props.cartItems.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-3 mb-5 max-h-52 overflow-y-auto pr-1 -mr-1">
                  {props.cartItems.map((item) => (
                    <div key={item.id} className="flex gap-3 items-center group">
                      <div className="relative h-12 w-12 flex-shrink-0 rounded-xl bg-secondary border border-border overflow-hidden">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-contain p-1 transition-transform group-hover:scale-105"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-base">🍾</div>
                        )}
                        <span className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate leading-tight">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{item.storeName}</p>
                      </div>
                      <span className="text-sm font-semibold text-foreground shrink-0">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator className="mb-4" />

                {/* Price breakdown */}
                <div className="space-y-2.5 mb-5 text-sm">
                  <Row label="Subtotal" value={`$${props.subtotal.toFixed(2)}`} muted />
                  <Row label={`Delivery${props.storeBreakdown.length > 1 ? ` (${props.storeBreakdown.length} stores)` : ""}`} value={`$${props.deliveryFee.toFixed(2)}`} muted />
                  {props.storeBreakdown.length > 1 && (
                    <div className="pl-3 border-l-2 border-border space-y-1">
                      {props.storeBreakdown.map((s) => (
                        <div key={s.id} className="flex justify-between text-muted-foreground text-xs">
                          <span className="truncate pr-2">{s.name}</span>
                          <span>${s.fee.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Row label="Service fee (12%)" value={`$${props.convenienceFee.toFixed(2)}`} muted />
                  <Row label="Tax" value={`$${props.tax.toFixed(2)}`} muted />
                  {props.tip > 0 && (
                    <Row
                      label={<span className="flex items-center gap-1"><Heart className="h-3 w-3 fill-primary text-primary" /> Driver tip</span>}
                      value={`$${props.tip.toFixed(2)}`}
                    />
                  )}
                </div>

                <Separator className="mb-4" />

                {/* Total */}
                <div className="flex items-end justify-between mb-5">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Estimated total</p>
                    <p className="font-display text-3xl font-bold text-foreground mt-0.5 tracking-tight">
                      ${props.estimatedTotal.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-muted-foreground leading-tight">
                    Card hold<br />
                    <span className="text-foreground font-semibold">${props.authorizedAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Pricing adjustment notice */}
                <div className="mb-4 rounded-xl bg-muted/60 border border-border/60 p-3 text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">Note:</span> Final price will be adjusted to match in-store prices at pickup and automatically reflected in your final charge. You'll only be charged the actual amount.
                </div>

                {/* CTA */}
                <Button
                  type="submit"
                  className="w-full h-14 gap-2 rounded-2xl font-display font-bold text-base bg-gradient-to-r from-primary to-primary/85 hover:from-primary hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5"
                  disabled={!stripe || !elements || props.isSubmitting}
                >
                  {props.isSubmitting ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> Authorizing...</>
                  ) : (
                    <><Lock className="h-4 w-4" /> Authorize ${props.authorizedAmount.toFixed(2)}</>
                  )}
                </Button>

                {/* Trust signals */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    25–35 min delivery
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <ShieldCheck className="h-3.5 w-3.5 text-success" />
                    Secure checkout
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground/80 text-center mt-4 leading-relaxed">
                  Must be 19+. Valid government ID required on delivery.<br />
                  By placing this order you agree to our terms of service.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

/* ───────────────────────── helpers ───────────────────────── */

const SectionCard = ({
  step,
  icon,
  title,
  subtitle,
  children,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <section className="bg-card rounded-2xl border border-border/70 shadow-sm shadow-foreground/[0.02] p-5 sm:p-6 transition-shadow hover:shadow-md hover:shadow-foreground/[0.04]">
    <header className="flex items-start gap-3 mb-5">
      <div className="relative flex-shrink-0">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20">
          {icon}
        </div>
        <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center ring-2 ring-card">
          {step}
        </span>
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <h2 className="font-display text-base sm:text-lg font-bold text-foreground tracking-tight leading-tight">
          {title}
        </h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </header>
    {children}
  </section>
);

const FieldInput = ({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: boolean }) => (
  <div>
    <Label className="text-xs font-medium text-muted-foreground ml-1">{label}</Label>
    <Input
      {...props}
      className={`mt-1.5 h-11 rounded-xl bg-background/60 border-border/80 transition-all focus-visible:ring-[3px] focus-visible:ring-ring/20 focus-visible:border-ring ${
        error ? "border-destructive focus-visible:ring-destructive/20 focus-visible:border-destructive" : ""
      }`}
    />
  </div>
);

const Row = ({ label, value, muted }: { label: React.ReactNode; value: string; muted?: boolean }) => (
  <div className={`flex justify-between items-center ${muted ? "text-muted-foreground" : "text-foreground"}`}>
    <span>{label}</span>
    <span className={muted ? "" : "font-medium"}>{value}</span>
  </div>
);

export default Checkout;
