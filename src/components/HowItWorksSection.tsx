import { MapPin, Package, Truck, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: MapPin,
    title: "Enter Your Address",
    description: "Tell us where you want your order delivered in Regina",
  },
  {
    icon: Package,
    title: "Choose Your Products",
    description: "Browse beer, wine, spirits, and smokes from local stores",
  },
  {
    icon: Truck,
    title: "We Deliver Fast",
    description: "Your order arrives at your door in under 60 minutes",
  },
  {
    icon: CheckCircle,
    title: "Enjoy Responsibly",
    description: "Show your ID, receive your order, and enjoy!",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="section-padding bg-[hsl(var(--primary-soft))] overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/15 text-[hsl(var(--primary-strong))] text-xs font-semibold tracking-widest uppercase mb-4">
            Simple Process
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
            How It Works
          </h2>
          <p className="text-muted-foreground text-base max-w-lg mx-auto">
            Getting your favourite drinks delivered has never been easier
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="relative text-center bg-card border border-border rounded-2xl p-6 hover:shadow-md hover:border-primary/30 transition-all">
              {/* Step Circle */}
              <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 text-[hsl(var(--primary-strong))] mb-4">
                <step.icon className="h-6 w-6" />
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-sm">
                  {index + 1}
                </div>
              </div>

              <h3 className="font-display text-base md:text-lg font-bold mb-2 text-foreground">
                {step.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
