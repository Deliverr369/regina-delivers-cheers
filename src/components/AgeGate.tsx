import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasVerifiedAge, markAgeVerified } from "@/lib/ageGate";
import logo from "@/assets/deliverr-logo.png";

const AgeGate = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Don't show the age gate on admin dashboard routes
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) return;
    if (!hasVerifiedAge()) setOpen(true);
  }, []);

  if (!open) return null;

  const confirm = () => {
    markAgeVerified();
    setOpen(false);
  };

  const deny = () => {
    // Send under-19 visitors to a government info page
    window.location.href = "https://www.canada.ca/en/health-canada/services/health-concerns/tobacco.html";
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/95 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-7 text-center">
        <img src={logo} alt="Deliverr" className="h-8 mx-auto mb-5" />
        <div className="w-14 h-14 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
          <ShieldAlert className="h-7 w-7 text-primary" />
        </div>
        <h1 id="age-gate-title" className="font-display text-2xl font-bold text-foreground mb-2">
          Are you 19 or older?
        </h1>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Deliverr sells age-restricted products (alcohol &amp; tobacco). You must be of legal age in
          Saskatchewan to enter. Valid government ID is required on delivery.
        </p>

        <div className="flex flex-col gap-2.5">
          <Button onClick={confirm} className="w-full h-11 rounded-full font-semibold">
            Yes, I'm 19+
          </Button>
          <Button onClick={deny} variant="outline" className="w-full h-11 rounded-full">
            No, I'm under 19
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-5 leading-relaxed">
          By entering you agree to our{" "}
          <Link to="/terms" className="text-primary hover:underline" onClick={confirm}>
            Terms
          </Link>{" "}
          &amp;{" "}
          <Link to="/privacy" className="text-primary hover:underline" onClick={confirm}>
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

export default AgeGate;
