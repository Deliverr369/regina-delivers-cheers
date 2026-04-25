import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/useCart";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PriceDisclaimer from "@/components/PriceDisclaimer";

const Cart = () => {
  const { cartItems, updateQuantity, removeFromCart, getCartTotal, clearCart } = useCart();

  const subtotal = getCartTotal();
  const getStoreFee = (name: string) => {
    const n = (name || "").toLowerCase();
    if (n.includes("costco")) return 20;
    if (n.includes("superstore")) return 15;
    return 7;
  };
  // Charge delivery fee per unique store in cart
  const uniqueStores = Array.from(
    new Map(cartItems.map((i) => [i.storeId, i.storeName])).entries()
  );
  const deliveryFee = uniqueStores.reduce((sum, [, name]) => sum + getStoreFee(name), 0);
  const storeCount = uniqueStores.length;
  const convenienceFee = subtotal * 0.12;
  const tax = subtotal * 0.11;
  const total = subtotal + deliveryFee + convenienceFee + tax;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-header pb-16">
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
      <main className="pt-header pb-32 lg:pb-16">
        <div className="bg-secondary/50 border-b border-border">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-3 min-w-0">
              <Link to="/stores" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-bold text-foreground truncate">Your Cart</h1>
                <p className="text-muted-foreground text-sm">{cartItems.length} item{cartItems.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-3 min-w-0">
              {cartItems.map((item) => (
                <div key={item.id} className="bg-card rounded-xl border border-border p-3.5 sm:p-4 flex gap-3 sm:gap-3.5 min-w-0 shadow-sm">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
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
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-foreground text-sm leading-snug line-clamp-2">{item.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.storeName}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 -mt-1 -mr-1" onClick={() => removeFromCart(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between mt-2 gap-2">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button variant="outline" size="icon" className="h-8 w-8 active:scale-95 transition-transform" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="font-semibold w-6 text-center text-sm tabular-nums">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8 active:scale-95 transition-transform" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="font-bold text-primary text-sm sm:text-base shrink-0 tabular-nums">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={clearCart}>Clear cart</Button>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1 min-w-0">
              <div className="bg-card rounded-2xl border border-border p-5 lg:sticky lg:top-20 shadow-sm">
                <h2 className="font-display text-lg font-bold text-foreground mb-5">Order Summary</h2>
                <div className="space-y-3 mb-5">
                  <div className="flex justify-between gap-2 text-muted-foreground text-sm"><span>Subtotal</span><span className="tabular-nums shrink-0">${subtotal.toFixed(2)}</span></div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between gap-2 text-foreground text-sm font-medium"><span className="min-w-0">Delivery{storeCount > 1 ? ` (${storeCount} stores)` : ""}</span><span className="tabular-nums shrink-0">${deliveryFee.toFixed(2)}</span></div>
                    {storeCount > 1 && (
                      <div className="pl-3 border-l-2 border-border space-y-1">
                        {uniqueStores.map(([id, name]) => (
                          <div key={id} className="flex justify-between gap-2 text-muted-foreground text-xs">
                            <span className="truncate min-w-0">{name}</span>
                            <span className="tabular-nums shrink-0">${getStoreFee(name).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between gap-2 text-muted-foreground text-sm"><span>Convenience Fee (12%)</span><span className="tabular-nums shrink-0">${convenienceFee.toFixed(2)}</span></div>
                  <div className="flex justify-between gap-2 text-muted-foreground text-sm"><span>Tax (GST + PST)</span><span className="tabular-nums shrink-0">${tax.toFixed(2)}</span></div>
                  <Separator />
                  <div className="flex justify-between gap-2 font-bold text-foreground text-base"><span>Total</span><span className="tabular-nums shrink-0">${total.toFixed(2)}</span></div>
                </div>
                <PriceDisclaimer variant="subtle" className="mb-4" />
                <Link to="/checkout" className="hidden lg:block">
                  <Button className="w-full gap-2 rounded-full font-semibold" size="lg">
                    Checkout <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <p className="text-[10px] text-muted-foreground text-center mt-3">Must be 19+. ID required on delivery.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile sticky checkout bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border pb-safe-plus pt-3 px-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground leading-none">Total</p>
              <p className="font-bold text-foreground text-lg tabular-nums leading-tight">${total.toFixed(2)}</p>
            </div>
            <Link to="/checkout" className="shrink-0">
              <Button className="gap-2 rounded-full font-semibold px-6" size="lg">
                Checkout <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cart;
