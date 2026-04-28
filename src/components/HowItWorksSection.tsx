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
    <section className="section-padding bg-charcoal text-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-primary-foreground/90 text-xs font-semibold tracking-widest uppercase mb-4">
            Simple Process
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">
            How It Works
          </h2>
          <p className="text-background/60 text-base max-w-lg mx-auto">
            Getting your favourite drinks delivered has never been easier
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="relative text-center">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-px bg-background/10" />
              )}

              {/* Step Circle */}
              <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-gradient mb-5 shadow-lg shadow-primary/20">
                <step.icon className="h-7 w-7 text-primary-foreground" />
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-background text-foreground flex items-center justify-center text-xs font-bold shadow">
                  {index + 1}
                </div>
              </div>

              <h3 className="font-display text-base md:text-lg font-bold mb-2">
                {step.title}
              </h3>
              <p className="text-background/55 text-sm leading-relaxed">
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
