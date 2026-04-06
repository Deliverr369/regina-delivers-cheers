import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, CreditCard, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Prediction {
  place_id: string;
  description: string;
}

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, getCartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = getCartTotal();
  const deliveryFee = subtotal > 50 ? 0 : 4.99;
  const tax = subtotal * 0.11;
  const total = subtotal + deliveryFee + tax;

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: user?.email || "", phone: "",
    address: "", city: "Regina", postalCode: "", deliveryInstructions: "", paymentMethod: "card",
  });
  const [cityError, setCityError] = useState<string | null>(null);

  // Autocomplete state
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSelectingPlace, setIsSelectingPlace] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const searchAddress = useCallback(async (input: string) => {
    if (input.length < 3) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("places-autocomplete", {
        body: { action: "autocomplete", input },
      });
      if (!error && data?.predictions) {
        setPredictions(data.predictions);
        setShowDropdown(data.predictions.length > 0);
      }
    } catch {
      // silently fail
    } finally {
      setIsSearching(false);
    }
  }, []);

  const selectPlace = async (prediction: Prediction) => {
    setIsSelectingPlace(true);
    setShowDropdown(false);
    try {
      const { data, error } = await supabase.functions.invoke("places-autocomplete", {
        body: { action: "details", placeId: prediction.place_id },
      });
      if (!error && data) {
        setFormData((prev) => ({
          ...prev,
          address: data.address || prev.address,
          city: data.city || prev.city,
          postalCode: data.postalCode || prev.postalCode,
        }));
        if (data.city && data.city.toLowerCase() !== "regina") {
          setCityError("We only deliver within Regina.");
        } else {
          setCityError(null);
        }
      }
    } catch {
      // silently fail
    } finally {
      setIsSelectingPlace(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "address") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => searchAddress(value), 350);
    }

    if (name === "city") {
      setCityError(value.trim().toLowerCase() !== "regina" ? "We only deliver within Regina." : null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }
    if (formData.city.trim().toLowerCase() !== "regina") {
      setCityError("We only deliver within Regina.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const storeId = cartItems[0]?.storeId;
      const { data: order, error: orderError } = await supabase.from("orders").insert({
        user_id: user.id, store_id: storeId || null, subtotal, delivery_fee: deliveryFee,
        tax, total, delivery_address: formData.address, delivery_city: formData.city,
        delivery_postal_code: formData.postalCode, delivery_instructions: formData.deliveryInstructions,
        payment_method: formData.paymentMethod, status: "pending",
      }).select().single();
      if (orderError) throw orderError;

      const orderItems = cartItems.map((item) => ({
        order_id: order.id, product_id: item.id, product_name: item.name, quantity: item.quantity, price: item.price,
      }));
      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      await supabase.from("profiles").update({
        full_name: `${formData.firstName} ${formData.lastName}`, phone: formData.phone,
        address: formData.address, city: formData.city, postal_code: formData.postalCode,
      }).eq("id", user.id);

      clearCart();
      toast({ title: "Order placed!", description: "Your order will arrive in 25-35 minutes." });
      navigate("/order-confirmation");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-16">
        <div className="bg-secondary/50 border-b border-border">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-3">
              <Link to="/cart" className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="font-display text-2xl font-bold text-foreground">Checkout</h1>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          {error && (
            <Alert variant="destructive" className="mb-5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

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
                    <div className="relative" ref={dropdownRef}>
                      <Label className="text-sm">Street Address</Label>
                      <div className="relative mt-1">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                        <Input
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          className="pl-10 h-10"
                          placeholder="Start typing your address..."
                          required
                          autoComplete="off"
                        />
                        {isSearching && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                        )}
                      </div>

                      {/* Autocomplete dropdown */}
                      {showDropdown && predictions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                          {predictions.map((p) => (
                            <button
                              key={p.place_id}
                              type="button"
                              onClick={() => selectPlace(p)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/60 transition-colors border-b border-border last:border-b-0"
                            >
                              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm text-foreground truncate">{p.description}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {isSelectingPlace && (
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading address details...
                      </div>
                    )}

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
                  <RadioGroup value={formData.paymentMethod} onValueChange={(v) => setFormData((p) => ({ ...p, paymentMethod: v }))} className="space-y-2">
                    <div className="flex items-center space-x-3 p-3 border border-border rounded-xl hover:border-primary/20 transition-colors">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1 text-sm">
                        <CreditCard className="h-4 w-4 text-muted-foreground" /> Pay on Delivery (Card)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 border border-border rounded-xl hover:border-primary/20 transition-colors">
                      <RadioGroupItem value="cash" id="cash" />
                      <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer flex-1 text-sm">💵 Pay on Delivery (Cash)</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {/* Summary */}
              <div className="lg:col-span-1">
                <div className="bg-card rounded-2xl border border-border p-5 sticky top-20">
                  <h2 className="font-display text-lg font-bold text-foreground mb-4">Order Summary</h2>
                  <div className="space-y-2.5 mb-4 max-h-40 overflow-y-auto">
                    {cartItems.map((item) => (
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
                    <div className="flex justify-between text-muted-foreground text-sm"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-muted-foreground text-sm"><span>Delivery</span><span>{deliveryFee === 0 ? "Free" : `$${deliveryFee.toFixed(2)}`}</span></div>
                    <div className="flex justify-between text-muted-foreground text-sm"><span>Tax</span><span>${tax.toFixed(2)}</span></div>
                    <Separator />
                    <div className="flex justify-between font-bold text-foreground"><span>Total</span><span>${total.toFixed(2)}</span></div>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-4">
                    <Clock className="h-3.5 w-3.5" /> Est. delivery: 25-35 min
                  </div>
                  <Button type="submit" className="w-full gap-2 rounded-full font-semibold" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? "Placing Order..." : <><CheckCircle className="h-4 w-4" /> Place Order — ${total.toFixed(2)}</>}
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center mt-3">Must be 19+. ID required on delivery.</p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
