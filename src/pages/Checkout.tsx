import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, CreditCard, Clock, CheckCircle, AlertCircle } from "lucide-react";
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
    firstName: "",
    lastName: "",
    email: user?.email || "",
    phone: "",
    address: "",
    city: "Regina",
    postalCode: "",
    deliveryInstructions: "",
    paymentMethod: "card",
  });
  const [cityError, setCityError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (name === "city") {
      if (value.trim().toLowerCase() !== "regina") {
        setCityError("Sorry, we are currently out of service area. We only deliver within Regina.");
      } else {
        setCityError(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      navigate("/login");
      return;
    }

    if (formData.city.trim().toLowerCase() !== "regina") {
      setCityError("Sorry, we are currently out of service area. We only deliver within Regina.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Get store ID from first cart item
      const storeId = cartItems[0]?.storeId;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          store_id: storeId || null,
          subtotal,
          delivery_fee: deliveryFee,
          tax,
          total,
          delivery_address: formData.address,
          delivery_city: formData.city,
          delivery_postal_code: formData.postalCode,
          delivery_instructions: formData.deliveryInstructions,
          payment_method: formData.paymentMethod,
          status: "pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update user profile
      await supabase
        .from("profiles")
        .update({
          full_name: `${formData.firstName} ${formData.lastName}`,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          postal_code: formData.postalCode,
        })
        .eq("id", user.id);

      clearCart();
      toast({
        title: "Order placed successfully!",
        description: "Your order will arrive in 25-35 minutes.",
      });
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
          <div className="container mx-auto px-4 text-center">
            <h1 className="font-display text-2xl font-bold mb-4">Please log in to checkout</h1>
            <Link to="/login">
              <Button>Log In</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (cartItems.length === 0) {
    navigate("/cart");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-8">
            <Link to="/cart" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Checkout
            </h1>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Form */}
              <div className="lg:col-span-2 space-y-8">
                {/* Contact Info */}
                <div className="bg-card rounded-xl border border-border p-6">
                  <h2 className="font-display text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</span>
                    Contact Information
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="bg-card rounded-xl border border-border p-6">
                  <h2 className="font-display text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</span>
                    Delivery Address
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="address">Street Address</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          className="pl-10"
                          placeholder="123 Main St"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          required
                          className={cityError ? "border-destructive" : ""}
                        />
                        {cityError && (
                          <p className="text-destructive text-sm mt-1">{cityError}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="postalCode">Postal Code</Label>
                        <Input
                          id="postalCode"
                          name="postalCode"
                          value={formData.postalCode}
                          onChange={handleChange}
                          placeholder="S4X 1A2"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="deliveryInstructions">Delivery Instructions (optional)</Label>
                      <Input
                        id="deliveryInstructions"
                        name="deliveryInstructions"
                        value={formData.deliveryInstructions}
                        onChange={handleChange}
                        placeholder="Ring doorbell, leave at door, etc."
                      />
                    </div>
                  </div>
                </div>

                {/* Payment */}
                <div className="bg-card rounded-xl border border-border p-6">
                  <h2 className="font-display text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">3</span>
                    Payment Method
                  </h2>
                  <RadioGroup
                    value={formData.paymentMethod}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, paymentMethod: value }))}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-3 p-4 border border-border rounded-lg">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        Pay on Delivery (Card)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-4 border border-border rounded-lg">
                      <RadioGroupItem value="cash" id="cash" />
                      <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer flex-1">
                        💵 Pay on Delivery (Cash)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-card rounded-xl border border-border p-6 sticky top-24">
                  <h2 className="font-display text-xl font-bold text-foreground mb-6">
                    Order Summary
                  </h2>

                  <div className="space-y-3 mb-6 max-h-48 overflow-y-auto">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <img
                          src={item.image || "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=100"}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground line-clamp-1">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <span className="text-sm font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Delivery</span>
                      <span>{deliveryFee === 0 ? "Free" : `$${deliveryFee.toFixed(2)}`}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between font-bold text-foreground text-lg">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-6">
                    <Clock className="h-4 w-4" />
                    Estimated delivery: 25-35 min
                  </div>

                  <Button type="submit" className="w-full gap-2" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? (
                      "Placing Order..."
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Place Order - ${total.toFixed(2)}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Must be 19+ to order. ID required on delivery.
                  </p>
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