import { Link } from "react-router-dom";
import { CheckCircle, Package, Clock, ArrowRight, MessageSquare, ShieldCheck, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PriceDisclaimer from "@/components/PriceDisclaimer";

const OrderConfirmation = () => {
  const orderNumber = `RS-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-header pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto">
            {/* Success Icon */}
            <div className="flex flex-col items-center text-center pt-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-success/20 blur-2xl rounded-full animate-pulse" />
                <div className="relative w-24 h-24 rounded-full bg-success/10 flex items-center justify-center animate-scale-in">
                  <CheckCircle className="h-12 w-12 text-success" strokeWidth={2.2} />
                </div>
              </div>

              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 animate-fade-in">
                Order Confirmed!
              </h1>

              <p className="text-muted-foreground text-base mb-8 animate-fade-in px-4" style={{ animationDelay: "0.1s" }}>
                Thank you for your order. Your beverages are on their way.
              </p>
            </div>

            {/* Order Number Card */}
            <div className="bg-card rounded-2xl border border-border p-6 mb-5 shadow-sm animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <div className="text-center mb-5 pb-5 border-b border-border">
                <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
                  <Receipt className="h-3 w-3" /> Order Number
                </div>
                <div className="font-display text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
                  {orderNumber}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Estimated</div>
                    <div className="font-semibold text-foreground text-sm truncate">25–35 min</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Status</div>
                    <div className="font-semibold text-foreground text-sm truncate">Preparing</div>
                  </div>
                </div>
              </div>
            </div>

            {/* What's Next */}
            <div className="bg-secondary/60 rounded-2xl p-5 sm:p-6 mb-5 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <h3 className="font-display font-bold text-foreground mb-4 text-base">What's next?</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <MessageSquare className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">You'll receive an SMS when your driver is on the way</span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">Have your ID ready — we check everyone who looks under 25</span>
                </li>
                <li className="flex gap-3">
                  <Receipt className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">Your card is on hold; the final amount is captured after delivery</span>
                </li>
              </ul>
            </div>

            <PriceDisclaimer className="mb-6 text-left animate-fade-in" />

            <div className="flex flex-col sm:flex-row gap-3 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <Link to="/" className="flex-1">
                <Button variant="outline" className="w-full rounded-full h-11">
                  Back to Home
                </Button>
              </Link>
              <Link to="/stores" className="flex-1">
                <Button className="w-full gap-2 rounded-full h-11">
                  Continue Shopping
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OrderConfirmation;
