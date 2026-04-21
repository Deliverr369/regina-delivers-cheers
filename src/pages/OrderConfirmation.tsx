import { Link } from "react-router-dom";
import { CheckCircle, Package, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PriceDisclaimer from "@/components/PriceDisclaimer";

const OrderConfirmation = () => {
  const orderNumber = `RS-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6 animate-scale-in">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>

            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4 animate-fade-in">
              Order Confirmed!
            </h1>
            
            <p className="text-muted-foreground text-lg mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              Thank you for your order. Your beverages are on their way!
            </p>

            <div className="bg-card rounded-xl border border-border p-6 mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <div className="text-sm text-muted-foreground mb-2">Order Number</div>
              <div className="font-display text-2xl font-bold text-foreground mb-6">
                {orderNumber}
              </div>

              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Estimated</div>
                    <div className="font-medium text-foreground">25-35 min</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <div className="font-medium text-foreground">Preparing</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-muted rounded-xl p-6 mb-8 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <h3 className="font-display font-bold text-foreground mb-2">What's Next?</h3>
              <ul className="text-left text-muted-foreground space-y-2">
                <li>• You'll receive an SMS when your driver is on the way</li>
                <li>• Have your ID ready - we check everyone who looks under 25</li>
                <li>• Payment will be collected upon delivery</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <Link to="/">
                <Button variant="outline" className="w-full sm:w-auto">
                  Back to Home
                </Button>
              </Link>
              <Link to="/stores">
                <Button className="w-full sm:w-auto gap-2">
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