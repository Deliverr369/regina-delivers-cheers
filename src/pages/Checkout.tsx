import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, CreditCard, Clock, CheckCircle, AlertCircle, ShieldCheck, Loader2, User, Heart, Lock, Sparkles } from "lucide-react";
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

const PaymentForm = ({
  formData,
  setFormData,
  cityError,
  setCityError,
  estimatedTotal,
  authorizedAmount,
  isSubmitting,
  setIsSubmitting,
  setError,
  paymentIntentId,
  onSuccess,
}: PaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "city") {
      setCityError(value.trim().toLowerCase() !== "regina" ? "We only deliver within Regina." : null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (formData.city.trim().toLowerCase() !== "regina") {
      setCityError("We only deliver within Regina.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      // Confirm the PaymentIntent (authorization only — no capture yet)
      const { error: stripeError } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.origin + "/order-confirmation" },
        redirect: "if_required",
      });

      if (stripeError) {
        setError(stripeError.message || "Payment authorization failed");
        setIsSubmitting(false);
        return;
      }

      await onSuccess();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Contact */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h2 className="font-display text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
              Contact Information
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label className="text-sm">First Name</Label><Input name="firstName" value={formData.firstName} onChange={handleChange} required className="mt-1 h-10" /></div>
              <div><Label className="text-sm">Last Name</Label><Input name="lastName" value={formData.lastName} onChange={handleChange} required className="mt-1 h-10" /></div>
              <div><Label className="text-sm">Email</Label><Input name="email" type="email" value={formData.email} onChange={handleChange} required className="mt-1 h-10" /></div>
              <div><Label className="text-sm">Phone</Label><Input name="phone" type="tel" value={formData.phone} onChange={handleChange} required className="mt-1 h-10" /></div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h2 className="font-display text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
              Delivery Address
            </h2>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Street Address</Label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input name="address" value={formData.address} onChange={handleChange} className="pl-10 h-10" placeholder="123 Main Street" required />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">City</Label>
                  <Input name="city" value={formData.city} onChange={handleChange} required className={`mt-1 h-10 ${cityError ? "border-destructive" : ""}`} />
                  {cityError && <p className="text-destructive text-xs mt-1">{cityError}</p>}
                </div>
                <div><Label className="text-sm">Postal Code</Label><Input name="postalCode" value={formData.postalCode} onChange={handleChange} placeholder="S4X 1A2" required className="mt-1 h-10" /></div>
              </div>
              <div>
                <Label className="text-sm">Delivery Instructions (optional)</Label>
                <Input name="deliveryInstructions" value={formData.deliveryInstructions} onChange={handleChange} placeholder="Ring doorbell, leave at door, etc." className="mt-1 h-10" />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h2 className="font-display text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
              Payment Method
            </h2>
            <Alert className="mb-4 border-primary/20 bg-primary/5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <AlertDescription className="text-xs">
                <strong>Final pricing confirmed by the store.</strong> Your card will be authorized for up to <strong>${authorizedAmount.toFixed(2)}</strong> (estimate +30% buffer). You'll only be charged the actual amount once your store confirms the final price.
              </AlertDescription>
            </Alert>
            <div className="border border-border rounded-xl p-3">
              <PaymentElement />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <SummaryCard
            estimatedTotal={estimatedTotal}
            authorizedAmount={authorizedAmount}
            isSubmitting={isSubmitting}
            disabled={!stripe || !elements}
          />
        </div>
      </div>
    </form>
  );
};

const SummaryCard = ({
  estimatedTotal,
  authorizedAmount,
  isSubmitting,
  disabled,
}: {
  estimatedTotal: number;
  authorizedAmount: number;
  isSubmitting: boolean;
  disabled: boolean;
}) => (
  <div className="bg-card rounded-2xl border border-border p-5 sticky top-20">
    <h2 className="font-display text-lg font-bold text-foreground mb-4">Order Summary</h2>
    <SummaryLines />
    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-2.5 mb-4">
      <p className="text-[11px] text-amber-900 dark:text-amber-200 leading-snug">
        <strong>Estimated total: ${estimatedTotal.toFixed(2)}</strong><br />
        Card hold: ${authorizedAmount.toFixed(2)} (released if not used)
      </p>
    </div>
    <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-4">
      <Clock className="h-3.5 w-3.5" /> Est. delivery: 25-35 min
    </div>
    <Button type="submit" className="w-full gap-2 rounded-full font-semibold" size="lg" disabled={disabled || isSubmitting}>
      {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Authorizing...</> : <><CheckCircle className="h-4 w-4" /> Authorize ${authorizedAmount.toFixed(2)}</>}
    </Button>
    <p className="text-[10px] text-muted-foreground text-center mt-3">Must be 19+. ID required on delivery.</p>
  </div>
);

const SummaryLines = () => null; // populated by parent via context — keeping summary simple here

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

  const subtotal = getCartTotal();
  const storeName = cartItems[0]?.storeName || "";
  const deliveryFee = cartItems.length > 0 ? getDeliveryFee(storeName) : 0;
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

  const [formData, setFormData] = useState<FormData>({
    firstName: "", lastName: "", email: user?.email || "", phone: "",
    address: "", city: "Regina", postalCode: "", deliveryInstructions: "",
  });
  const [cityError, setCityError] = useState<string | null>(null);

  // Create PaymentIntent on mount
  useEffect(() => {
    if (!user || cartItems.length === 0) return;
    let cancelled = false;
    (async () => {
      setInitLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("create-payment-intent", {
          body: { estimated_total: estimatedTotal },
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
  }, [user, cartItems.length, estimatedTotal]);

  const handleSuccess = async () => {
    if (!user) return;
    try {
      const storeId = cartItems[0]?.storeId;
      const { data: order, error: orderError } = await supabase.from("orders").insert({
        user_id: user.id,
        store_id: storeId || null,
        subtotal,
        delivery_fee: deliveryFee,
        tax,
        total: estimatedTotal,
        estimated_subtotal: subtotal,
        estimated_total: estimatedTotal,
        authorized_amount: authorizedAmount,
        convenience_fee: convenienceFee,
        stripe_payment_intent_id: paymentIntentId,
        payment_status: "authorized",
        delivery_address: formData.address,
        delivery_city: formData.city,
        delivery_postal_code: formData.postalCode,
        delivery_instructions: formData.deliveryInstructions,
        payment_method: "card",
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
      toast({ title: "Order placed!", description: "Card authorized — final amount confirmed by your store." });
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

          {initLoading ? (
            <div className="flex items-center justify-center py-32 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Preparing secure payment...
            </div>
          ) : clientSecret && elementsOptions ? (
            <Elements stripe={stripePromise} options={elementsOptions}>
              <CheckoutBody
                formData={formData}
                setFormData={setFormData}
                cityError={cityError}
                setCityError={setCityError}
                cartItems={cartItems}
                subtotal={subtotal}
                deliveryFee={deliveryFee}
                convenienceFee={convenienceFee}
                tax={tax}
                tip={tip}
                tipPreset={tipPreset}
                setTipPreset={setTipPreset}
                customTip={customTip}
                setCustomTip={setCustomTip}
                estimatedTotal={estimatedTotal}
                authorizedAmount={authorizedAmount}
                isSubmitting={isSubmitting}
                setIsSubmitting={setIsSubmitting}
                setError={setError}
                paymentIntentId={paymentIntentId}
                onSuccess={handleSuccess}
              />
            </Elements>
          ) : (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Could not initialize payment. Please refresh.</AlertDescription>
            </Alert>
          )}
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
  convenienceFee: number;
  tax: number;
  tip: number;
  tipPreset: number | "custom" | null;
  setTipPreset: (v: number | "custom" | null) => void;
  customTip: string;
  setCustomTip: (v: string) => void;
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
    if (!stripe || !elements) return;
    if (props.formData.city.trim().toLowerCase() !== "regina") {
      props.setCityError("We only deliver within Regina.");
      return;
    }
    props.setIsSubmitting(true);
    props.setError(null);

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
    await props.onSuccess();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Contact */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h2 className="font-display text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
              Contact Information
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label className="text-sm">First Name</Label><Input name="firstName" value={props.formData.firstName} onChange={handleChange} required className="mt-1 h-10" /></div>
              <div><Label className="text-sm">Last Name</Label><Input name="lastName" value={props.formData.lastName} onChange={handleChange} required className="mt-1 h-10" /></div>
              <div><Label className="text-sm">Email</Label><Input name="email" type="email" value={props.formData.email} onChange={handleChange} required className="mt-1 h-10" /></div>
              <div><Label className="text-sm">Phone</Label><Input name="phone" type="tel" value={props.formData.phone} onChange={handleChange} required className="mt-1 h-10" /></div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h2 className="font-display text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
              Delivery Address
            </h2>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Street Address</Label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input name="address" value={props.formData.address} onChange={handleChange} className="pl-10 h-10" placeholder="123 Main Street" required />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">City</Label>
                  <Input name="city" value={props.formData.city} onChange={handleChange} required className={`mt-1 h-10 ${props.cityError ? "border-destructive" : ""}`} />
                  {props.cityError && <p className="text-destructive text-xs mt-1">{props.cityError}</p>}
                </div>
                <div><Label className="text-sm">Postal Code</Label><Input name="postalCode" value={props.formData.postalCode} onChange={handleChange} placeholder="S4X 1A2" required className="mt-1 h-10" /></div>
              </div>
              <div>
                <Label className="text-sm">Delivery Instructions (optional)</Label>
                <Input name="deliveryInstructions" value={props.formData.deliveryInstructions} onChange={handleChange} placeholder="Ring doorbell, leave at door, etc." className="mt-1 h-10" />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h2 className="font-display text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
              Payment Method
            </h2>
            <Alert className="mb-4 border-primary/20 bg-primary/5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <AlertDescription className="text-xs">
                <strong>Final pricing confirmed by the store.</strong> Your card will be authorized for up to <strong>${props.authorizedAmount.toFixed(2)}</strong> (estimate +30% buffer). You'll only be charged the actual amount once your store confirms the final price.
              </AlertDescription>
            </Alert>
            <div className="border border-border rounded-xl p-3">
              <PaymentElement />
            </div>
          </div>
          {/* Tip */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h2 className="font-display text-base font-bold text-foreground mb-1.5 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>
              Add a Tip for Your Driver
            </h2>
            <p className="text-xs text-muted-foreground mb-4">100% of your tip goes to the driver delivering your order.</p>
            <div className="grid grid-cols-4 gap-2">
              {[3, 5, 8].map((amt) => {
                const selected = props.tipPreset === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => props.setTipPreset(amt)}
                    className={`h-12 rounded-xl border-2 font-semibold text-sm transition-all ${
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground hover:border-primary/50"
                    }`}
                  >
                    ${amt}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => props.setTipPreset("custom")}
                className={`h-12 rounded-xl border-2 font-semibold text-sm transition-all ${
                  props.tipPreset === "custom"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:border-primary/50"
                }`}
              >
                Custom
              </button>
            </div>
            {props.tipPreset === "custom" && (
              <div className="mt-3">
                <Label className="text-sm">Custom tip amount</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.50"
                    value={props.customTip}
                    onChange={(e) => props.setCustomTip(e.target.value)}
                    placeholder="0.00"
                    className="pl-7 h-10"
                    autoFocus
                  />
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => props.setTipPreset(null)}
              className={`text-xs mt-3 ${props.tipPreset === null ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"} transition-colors`}
            >
              No tip
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-2xl border border-border p-5 sticky top-20">
            <h2 className="font-display text-lg font-bold text-foreground mb-4">Order Summary</h2>
            <div className="space-y-2.5 mb-4 max-h-40 overflow-y-auto">
              {props.cartItems.map((item) => (
                <div key={item.id} className="flex gap-2.5">
                  <img src={item.image || "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=100"} alt={item.name} className="w-10 h-10 object-cover rounded-lg bg-muted" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <span className="text-xs font-medium shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <Separator className="my-3" />
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-muted-foreground text-sm"><span>Subtotal (est.)</span><span>${props.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-muted-foreground text-sm"><span>Delivery</span><span>${props.deliveryFee.toFixed(2)}</span></div>
              <div className="flex justify-between text-muted-foreground text-sm"><span>Convenience Fee (12%)</span><span>${props.convenienceFee.toFixed(2)}</span></div>
              <div className="flex justify-between text-muted-foreground text-sm"><span>Tax</span><span>${props.tax.toFixed(2)}</span></div>
              <div className="flex justify-between text-foreground text-sm"><span>Driver Tip</span><span>${props.tip.toFixed(2)}</span></div>
              <Separator />
              <div className="flex justify-between font-bold text-foreground"><span>Estimated Total</span><span>${props.estimatedTotal.toFixed(2)}</span></div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-2.5 mb-4">
              <p className="text-[11px] text-amber-900 dark:text-amber-200 leading-snug">
                <strong>Card hold:</strong> ${props.authorizedAmount.toFixed(2)}<br />
                Only the final amount confirmed by your store will be charged. Any unused hold is released.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-4">
              <Clock className="h-3.5 w-3.5" /> Est. delivery: 25-35 min
            </div>
            <Button type="submit" className="w-full gap-2 rounded-full font-semibold" size="lg" disabled={!stripe || !elements || props.isSubmitting}>
              {props.isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Authorizing...</> : <><CheckCircle className="h-4 w-4" /> Authorize ${props.authorizedAmount.toFixed(2)}</>}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center mt-3">Must be 19+. ID required on delivery.</p>
          </div>
        </div>
      </div>
    </form>
  );
};

export default Checkout;
