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
    description: "Browse our selection of beer, wine, spirits, and smokes",
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
    <section className="py-24 bg-foreground text-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-background/70 text-lg max-w-2xl mx-auto">
            Getting your favorite drinks delivered has never been easier
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="relative text-center animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-1/2 w-full h-0.5 bg-background/20" />
              )}
              
              {/* Step Number */}
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary mb-6">
                <step.icon className="h-8 w-8 text-primary-foreground" />
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-bold">
                  {index + 1}
                </div>
              </div>

              <h3 className="font-display text-xl font-bold mb-3">
                {step.title}
              </h3>
              <p className="text-background/70">
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