import { Shield, Clock, DollarSign, MapPin, Truck, Award } from "lucide-react";

const features = [
  {
    icon: Clock,
    title: "Fast Delivery",
    description: "Most orders delivered in under 60 minutes across Regina",
  },
  {
    icon: DollarSign,
    title: "Store Prices",
    description: "No markup — you pay the same price as buying in-store",
  },
  {
    icon: Shield,
    title: "Safe & Legal",
    description: "Licensed delivery with ID verification on every order",
  },
  {
    icon: MapPin,
    title: "Local Stores",
    description: "Shop from your favourite Regina liquor stores",
  },
  {
    icon: Truck,
    title: "Free Delivery",
    description: "Free delivery on orders over $50 — no hidden fees",
  },
  {
    icon: Award,
    title: "Wide Selection",
    description: "Beer, wine, spirits, smokes — all in one place",
  },
];

const WhyChooseUsSection = () => {
  return (
    <section className="section-padding bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
            Why Choose Deliverr?
          </h2>
          <p className="text-muted-foreground text-base max-w-lg mx-auto">
            Regina's most trusted liquor delivery service
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
          {features.map((feature, i) => (
            <div
              key={i}
              className="text-center p-5 md:p-6 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-lg transition-all duration-300"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/15 text-[hsl(var(--primary-strong))] mb-4">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-foreground mb-1.5 text-sm md:text-base">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUsSection;
