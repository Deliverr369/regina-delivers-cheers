import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Prediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: string, isRegina: boolean) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  error?: string | null;
}

const AddressAutocomplete = ({
  value,
  onChange,
  onSelect,
  placeholder = "Enter your delivery address",
  className,
  inputClassName,
  error,
}: AddressAutocompleteProps) => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchPredictions = useCallback(async (input: string) => {
    if (input.trim().length < 3) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("places-autocomplete", {
        body: { input },
      });

      if (error) throw error;
      setPredictions(data?.predictions || []);
      setShowDropdown(true);
      setSelectedIndex(-1);
    } catch (err) {
      console.error("Autocomplete error:", err);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(val), 300);
  };

  const isReginaAddress = (description: string): boolean => {
    const lower = description.toLowerCase();
    return lower.includes("regina") && lower.includes("sk");
  };

  const handleSelect = (prediction: Prediction) => {
    onChange(prediction.description);
    setShowDropdown(false);
    setPredictions([]);
    onSelect(prediction.description, isReginaAddress(prediction.description));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || predictions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, predictions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(predictions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
        <Input
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => predictions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className={cn("pl-10", inputClassName)}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 mt-2 text-destructive text-sm">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          {predictions.map((prediction, index) => {
            const isRegina = isReginaAddress(prediction.description);
            return (
              <button
                key={prediction.place_id}
                type="button"
                onClick={() => handleSelect(prediction)}
                className={cn(
                  "w-full text-left px-4 py-3 flex items-start gap-3 transition-colors",
                  index === selectedIndex ? "bg-accent" : "hover:bg-accent/50",
                  !isRegina && "opacity-50"
                )}
              >
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {prediction.main_text}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {prediction.secondary_text}
                  </p>
                  {!isRegina && (
                    <p className="text-xs text-destructive mt-0.5">Outside delivery area</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
