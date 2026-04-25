import { useEffect, useRef, useState, ReactNode } from "react";
import { Loader2, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

interface PullToRefreshProps {
  onRefresh: () => void | Promise<void>;
  children: ReactNode;
  /** Distance the user must drag before a refresh triggers, in pixels. */
  threshold?: number;
  /** Disable on web (most browsers handle their own pull-to-refresh). Default true. */
  nativeOnly?: boolean;
  className?: string;
}

const PullToRefresh = ({
  onRefresh,
  children,
  threshold = 70,
  nativeOnly = false,
  className,
}: PullToRefreshProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // If nativeOnly and we're not on a touch device, skip listeners entirely.
    if (nativeOnly && typeof window !== "undefined" && !("ontouchstart" in window)) return;

    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || refreshing) {
        startYRef.current = null;
        return;
      }
      startYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy > 0 && window.scrollY <= 0) {
        // dampen
        const damped = Math.min(dy * 0.5, threshold * 1.6);
        setPullDistance(damped);
      }
    };

    const handleTouchEnd = async () => {
      if (startYRef.current === null) return;
      startYRef.current = null;
      if (pullDistance >= threshold && !refreshing) {
        setRefreshing(true);
        haptics.light();
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pullDistance, refreshing, threshold, nativeOnly, onRefresh]);

  const triggered = pullDistance >= threshold;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Pull indicator */}
      <div
        aria-hidden
        className="absolute left-0 right-0 -top-12 flex items-center justify-center pointer-events-none transition-opacity"
        style={{
          opacity: pullDistance > 5 || refreshing ? 1 : 0,
          transform: `translateY(${refreshing ? 48 : Math.min(pullDistance, 80)}px)`,
          transition: refreshing || pullDistance === 0 ? "transform 200ms ease-out" : "none",
        }}
      >
        <div className="bg-card shadow-lg border border-border rounded-full h-10 w-10 flex items-center justify-center">
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <ArrowDown
              className={cn(
                "h-4 w-4 transition-all",
                triggered ? "text-primary rotate-180" : "text-muted-foreground"
              )}
            />
          )}
        </div>
      </div>

      <div
        style={{
          transform: refreshing ? "translateY(48px)" : `translateY(${pullDistance * 0.4}px)`,
          transition: refreshing || pullDistance === 0 ? "transform 200ms ease-out" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
