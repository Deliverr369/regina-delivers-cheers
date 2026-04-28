import { Link } from "react-router-dom";
import { ArrowRight, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="section-padding bg-primary-gradient relative overflow-hidden">
      {/* Subtle pattern */}
      <div className="absolute inset-0 opacity-[0.05]">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-black/10 blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-2 rounded-full mb-6">
            <Truck className="h-4 w-4 text-primary-foreground" />
            <span className="text-primary-foreground/90 text-sm font-medium">Free delivery on orders $50+</span>
          </div>

          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-5 leading-tight">
            Ready to order? Browse stores and get started
          </h2>

          <p className="text-primary-foreground/80 text-base md:text-lg mb-8 max-w-xl mx-auto">
            Join thousands of satisfied customers in Regina who trust Deliverr for fast, reliable liquor delivery
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/stores">
              <Button size="lg" className="gap-2 text-base px-8 rounded-full font-semibold bg-white text-primary hover:bg-white/95 shadow-lg">
                Start Ordering
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="lg" variant="outline" className="gap-2 text-base px-8 rounded-full bg-transparent border-white/40 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
                Create Free Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
