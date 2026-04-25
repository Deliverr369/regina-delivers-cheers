import { Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  productId: string;
  /** Visual variant: 'overlay' is for product cards (sits over the image), 'inline' is a normal button. */
  variant?: "overlay" | "inline";
  className?: string;
}

const FavoriteButton = ({ productId, variant = "overlay", className }: FavoriteButtonProps) => {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const navigate = useNavigate();
  const active = isFavorite(productId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast("Sign in to save favourites", {
        action: { label: "Log in", onClick: () => navigate("/login") },
      });
      return;
    }
    haptics.light();
    const res = await toggleFavorite(productId);
    if (res.added) toast.success("Added to favourites ❤️");
  };

  if (variant === "inline") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        className={cn("gap-2 rounded-full", className)}
        aria-pressed={active}
      >
        <Heart className={cn("h-4 w-4", active && "fill-primary text-primary")} />
        {active ? "Saved" : "Save"}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={active ? "Remove from favourites" : "Add to favourites"}
      aria-pressed={active}
      className={cn(
        "h-8 w-8 rounded-full bg-background/90 backdrop-blur-md border border-border/60 shadow-sm flex items-center justify-center transition-all active:scale-90 hover:bg-background",
        className
      )}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-all",
          active ? "fill-primary text-primary scale-110" : "text-muted-foreground"
        )}
      />
    </button>
  );
};

export default FavoriteButton;
