import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/useCart";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Cart = () => {
  const { cartItems, updateQuantity, removeFromCart, getCartTotal, clearCart } = useCart();

  const subtotal = getCartTotal();
  const storeName = cartItems[0]?.storeName || "";
  const getDeliveryFee = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("costco")) return 20;
    if (n.includes("superstore")) return 15;
    return 7;
  };
  const deliveryFee = cartItems.length > 0 ? getDeliveryFee(storeName) : 0;
  const convenienceFee = subtotal * 0.12;
  const tax = subtotal * 0.11;
  const total = subtotal + deliveryFee + convenienceFee + tax;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-20 pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              </div>
              <h1 className="font-display text-xl font-bold text-foreground mb-1.5">Your cart is empty</h1>
              <p className="text-muted-foreground text-sm mb-6">Browse stores and add items to get started</p>
              <Link to="/stores">
                <Button className="gap-2 rounded-full">
                  Browse Stores <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-16">
        <div className="bg-secondary/50 border-b border-border">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-3">
              <Link to="/stores" className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">Your Cart</h1>
                <p className="text-muted-foreground text-sm">{cartItems.length} item{cartItems.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-3">
              {cartItems.map((item) => (
                <div key={item.id} className="bg-card rounded-xl border border-border p-4 flex gap-3.5">
                  <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <ShoppingBag className="h-7 w-7 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <div className="min-w-0">
                        <h3 className="font-medium text-foreground text-sm truncate">{item.name}</h3>
                        <p className="text-xs text-muted-foreground">{item.storeName}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeFromCart(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="font-medium w-6 text-center text-sm">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="font-bold text-primary text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={clearCart}>Clear cart</Button>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-2xl border border-border p-5 sticky top-20">
                <h2 className="font-display text-lg font-bold text-foreground mb-5">Order Summary</h2>
                <div className="space-y-3 mb-5">
                  <div className="flex justify-between text-muted-foreground text-sm"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-muted-foreground text-sm"><span>Delivery</span><span>${deliveryFee.toFixed(2)}</span></div>
                  <div className="flex justify-between text-muted-foreground text-sm"><span>Convenience Fee (12%)</span><span>${convenienceFee.toFixed(2)}</span></div>
                  <div className="flex justify-between text-muted-foreground text-sm"><span>Tax (GST + PST)</span><span>${tax.toFixed(2)}</span></div>
                  <Separator />
                  <div className="flex justify-between font-bold text-foreground text-base"><span>Total</span><span>${total.toFixed(2)}</span></div>
                </div>
                <Link to="/checkout">
                  <Button className="w-full gap-2 rounded-full font-semibold" size="lg">
                    Checkout <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <p className="text-[10px] text-muted-foreground text-center mt-3">Must be 19+. ID required on delivery.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cart;
