import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, ArrowRight, Star } from "lucide-react";
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
      text: "Service just as described, fast & fair. I love to shop from large selection of items, weekly flyers and special deals! Definitely recommended.",
      author: "Ronald Mcgrail",
    },
    {
      text: "App is easy to order, delivery is fast and reliable. Never had an issue in well over two years of use. I love it!",
      author: "Dean Avelar",
    },
    {
      text: "The website ordering is super friendly to use. Every time I placed an order it came very fast. Highly recommended.",
      author: "Ryan Dilard",
    },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1597290282695-edc43d0e7129?q=80&w=2070&auto=format&fit=crop')`,
        }}
      />
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-foreground/60" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-16 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Glass Card */}
          <div className="glass rounded-2xl p-8 md:p-12 text-center animate-fade-in">
            {/* Main Heading */}
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
              Beer, Wine & Spirits.
            </h1>
            
            <p className="text-lg md:text-xl text-foreground/80 mb-2">
              Deliverr'd at liquor stores price under 60 minutes
            </p>
            
            <p className="text-muted-foreground mb-8">
              Serving in Regina & Saskatoon | 10:00 AM - 10:00 PM
            </p>

            {/* Address Input */}
            <form 
              onSubmit={handleSubmit}
              className="max-w-xl mx-auto mb-8"
            >
              <div className="flex items-center bg-background border border-border rounded-full overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-4 flex-1">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                  <Input
                    type="text"
                    placeholder="Enter your delivery address to order"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground py-6"
                  />
                </div>
                <Button type="submit" size="lg" className="rounded-full m-1.5 px-6 bg-primary hover:bg-primary/90">
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </form>

            {/* App Store Buttons */}
            <div className="flex items-center justify-center gap-4 mb-10">
              <a href="#" className="transition-transform hover:scale-105">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Download_on_the_App_Store_Badge.svg/1200px-Download_on_the_App_Store_Badge.svg.png" 
                  alt="Download on App Store" 
                  className="h-10 md:h-12"
                />
              </a>
              <a href="#" className="transition-transform hover:scale-105">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Google_Play_Store_badge_EN.svg/1200px-Google_Play_Store_badge_EN.svg.png" 
                  alt="Get it on Google Play" 
                  className="h-10 md:h-12"
                />
              </a>
            </div>

            {/* Testimonials */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-border/50">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="text-center">
                  <div className="flex justify-center gap-0.5 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-foreground/70 text-sm mb-3 leading-relaxed">
                    {testimonial.text}
                  </p>
                  <p className="text-foreground font-medium">- {testimonial.author}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
