import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, ArrowRight, Star, Shield, Clock, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const HeroSection = () => {
  const [address, setAddress] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/stores${address.trim() ? `?address=${encodeURIComponent(address)}` : ""}`);
  };

  const stats = [
    { icon: Clock, label: "Under 60 min", sublabel: "Average delivery" },
    { icon: Shield, label: "Store prices", sublabel: "No markup" },
    { icon: Truck, label: "Free delivery", sublabel: "On orders $50+" },
  ];

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1597290282695-edc43d0e7129?q=80&w=2070&auto=format&fit=crop')`,
        }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 hero-overlay" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-20 pb-12">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-md px-4 py-2 rounded-full mb-8 border border-primary/30">
            <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-white/90 text-sm font-medium">Now delivering in Regina</span>
          </div>

          {/* Main Heading */}
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-5 leading-[1.1]">
            Beer, Wine & Spirits
            <span className="block text-primary">Delivered Fast</span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/75 mb-10 max-w-xl mx-auto leading-relaxed">
            Order from Regina's top liquor stores and get it delivered to your door in under 60 minutes — at store prices.
          </p>

          {/* Address Input */}
          <form onSubmit={handleSubmit} className="max-w-lg mx-auto mb-12">
            <div className="flex items-center bg-white rounded-full overflow-hidden shadow-2xl shadow-black/20">
              <div className="flex items-center gap-2 px-5 flex-1">
                <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                <Input
                  type="text"
                  placeholder="Enter your delivery address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground py-6 text-base"
                />
              </div>
              <Button type="submit" size="lg" className="rounded-full m-1.5 px-8 h-12 text-base font-semibold gap-2">
                Order Now
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-12">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm mb-2">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-white font-semibold text-sm">{stat.label}</p>
                <p className="text-white/50 text-xs">{stat.sublabel}</p>
              </div>
            ))}
          </div>

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-8 border-t border-white/10">
            {[
              { text: "Fast and reliable every time. Great selection and always at store prices!", author: "Ronald M." },
              { text: "App is super easy to use. Never had an issue in over two years. Love it!", author: "Dean A." },
              { text: "Ordering is simple and delivery is quick. Highly recommended for Regina!", author: "Ryan D." },
            ].map((t, i) => (
              <div key={i} className="text-center px-2">
                <div className="flex justify-center gap-0.5 mb-2">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-gold text-gold" />
                  ))}
                </div>
                <p className="text-white/60 text-sm mb-2 leading-relaxed line-clamp-2">{t.text}</p>
                <p className="text-white/80 font-medium text-sm">— {t.author}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
