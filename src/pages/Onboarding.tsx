import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Truck, PartyPopper, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markOnboardingComplete } from "@/lib/onboarding";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const slides = [
  {
    icon: ShoppingBag,
    title: "Browse local liquor stores",
    body: "Beer, wine, spirits, smokes & more — all from Regina's best stores in one app.",
    accent: "bg-primary/10 text-primary",
  },
  {
    icon: Truck,
    title: "Fast delivery to your door",
    body: "A personal shopper picks up your order and delivers it within ~30–45 minutes.",
    accent: "bg-blue-500/10 text-blue-500",
  },
  {
    icon: PartyPopper,
    title: "Cheers, Regina!",
    body: "Track every order in real time. Reorder favourites with one tap.",
    accent: "bg-success/10 text-success",
  },
];

const Onboarding = () => {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const isLast = index === slides.length - 1;
  const slide = slides[index];
  const Icon = slide.icon;

  const finish = () => {
    haptics.success();
    markOnboardingComplete();
    navigate("/stores", { replace: true });
  };

  const next = () => {
    haptics.light();
    if (isLast) finish();
    else setIndex((i) => i + 1);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col safe-top safe-bottom">
      <div className="flex justify-end p-4">
        <Button variant="ghost" size="sm" onClick={finish} className="text-muted-foreground">
          Skip
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className={cn("h-24 w-24 rounded-3xl flex items-center justify-center mb-8", slide.accent)}>
          <Icon className="h-12 w-12" strokeWidth={1.75} />
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground mb-3 max-w-xs">
          {slide.title}
        </h1>
        <p className="text-muted-foreground text-base max-w-sm leading-relaxed">{slide.body}</p>
      </div>

      <div className="px-6 pb-8 pt-4 space-y-6">
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 rounded-full transition-all",
                i === index ? "w-6 bg-primary" : "w-2 bg-muted"
              )}
            />
          ))}
        </div>

        <Button
          size="lg"
          className="w-full rounded-full font-semibold gap-2"
          onClick={next}
        >
          {isLast ? "Get started" : "Continue"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;
