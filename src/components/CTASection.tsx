import { Link } from "react-router-dom";
import { ArrowRight, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="section-padding bg-primary-gradient relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/15 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/10 blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/25 backdrop-blur-sm border border-white/30 px-4 py-2 rounded-full mb-6">
            <Truck className="h-4 w-4 text-white" />
            <span className="text-white text-sm font-medium">Free delivery on orders $50+</span>
          </div>

          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5 leading-tight drop-shadow-sm">
            Ready to order? Browse stores and get started
          </h2>

          <p className="text-white/90 text-base md:text-lg mb-8 max-w-xl mx-auto">
            Join thousands of satisfied customers in Regina who trust Deliverr for fast, reliable liquor delivery
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/stores">
              <Button size="lg" className="gap-2 text-base px-8 rounded-full font-semibold bg-white text-[hsl(var(--primary-strong))] hover:bg-white shadow-lg hover:shadow-xl">
                Start Ordering
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="lg" variant="outline" className="gap-2 text-base px-8 rounded-full bg-transparent border-white/60 text-white hover:bg-white/15 hover:text-white">
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
