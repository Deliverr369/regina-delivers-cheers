import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, ArrowRight, Clock, Star, Truck, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const HeroSection = () => {
  const [address, setAddress] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim()) {
      navigate(`/stores?address=${encodeURIComponent(address)}`);
    }
  };

  const testimonials = [
    {
      text: "Service just as described, fast & fair. I love to shop from large selection of items, weekly flyers and special deals!",
      author: "Ronald M.",
    },
    {
      text: "App is easy to order, delivery is fast and reliable. Never had an issue in well over two years of use. I love it!",
      author: "Dean A.",
    },
    {
      text: "The website ordering is super friendly to use. Every time I placed an order it came very fast. Highly recommended.",
      author: "Ryan D.",
    },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1574015974293-817f0ebebb74?q=80&w=2070&auto=format&fit=crop')`,
        }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 hero-overlay" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Heading */}
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 animate-fade-in">
            Beer, Wine & Spirits.
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 mb-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Deliverr'd at liquor store prices under 60 minutes
          </p>
          
          <p className="text-white/70 mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Serving in Regina & Saskatoon | 10:00 AM - 10:00 PM
          </p>

          {/* Address Input */}
          <form 
            onSubmit={handleSubmit}
            className="max-w-2xl mx-auto mb-12 animate-fade-in"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="flex flex-col sm:flex-row gap-3 p-2 bg-background rounded-xl shadow-2xl">
              <div className="flex-1 flex items-center gap-3 px-4">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <Input
                  type="text"
                  placeholder="Enter your delivery address to order"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <Button type="submit" size="lg" className="bg-primary hover:bg-primary/90 px-8">
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </form>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <div className="flex items-center justify-center gap-3 text-white/80">
              <Clock className="h-5 w-5 text-primary" />
              <span>Under 60 min delivery</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-white/80">
              <Truck className="h-5 w-5 text-primary" />
              <span>Store prices guaranteed</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-white/80">
              <Shield className="h-5 w-5 text-primary" />
              <span>Safe & secure delivery</span>
            </div>
          </div>

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: "0.5s" }}>
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="glass rounded-xl p-6 text-left"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-gold text-gold" />
                  ))}
                </div>
                <p className="text-foreground/80 text-sm mb-4">{testimonial.text}</p>
                <p className="text-foreground font-medium">- {testimonial.author}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-white/50 rounded-full" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;