import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, User, Phone, MapPin, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import logo from "@/assets/deliverr-logo.png";

const CA_POSTAL_RE = /^[ABCEGHJKLMNPRSTVXY]\d[ABCEGHJKLMNPRSTVWXYZ][ -]?\d[ABCEGHJKLMNPRSTVWXYZ]\d$/i;

const Signup = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirectTo = params.get("redirect") || "/stores";
  const { signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    address: "",
    postalCode: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ageConfirmed) {
      setError("You must confirm you are 19+ to create an account");
      return;
    }
    const postal = formData.postalCode.trim().toUpperCase();
    if (!CA_POSTAL_RE.test(postal) || !/^S4/i.test(postal)) {
      setError("Please enter a valid Regina postal code (starts with S4).");
      return;
    }
    setIsLoading(true);
    setError(null);

    const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
    const { error } = await signUp(formData.email, formData.password, fullName, formData.phone);
    if (error) {
      setError(
        error.message.includes("already registered")
          ? "This email is already registered. Please log in instead."
          : error.message,
      );
      setIsLoading(false);
      return;
    }

    // Save the details once so checkout can fill them in automatically.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({
        full_name: fullName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address.trim(),
        city: "Regina",
        postal_code: postal,
      }).eq("id", user.id);

      await supabase.from("user_addresses").insert({
        user_id: user.id,
        label: "Home",
        recipient_name: fullName,
        phone: formData.phone,
        address: formData.address.trim(),
        city: "Regina",
        postal_code: postal,
        is_default: true,
      });
    }

    navigate(redirectTo);
  };

  return (
    <div className="min-h-screen bg-secondary/50">
      <Header />
      <main className="pt-20 pb-16 flex items-center justify-center min-h-screen">
        <div className="container mx-auto px-4">
          <div className="max-w-sm mx-auto">
            <div className="bg-card rounded-2xl border border-border shadow-lg p-7">
              <div className="text-center mb-6">
                <img src={logo} alt="Deliverr" className="h-7 mx-auto mb-5" />
                <h1 className="font-display text-2xl font-bold text-foreground mb-1">
                  Create Account
                </h1>
                <p className="text-muted-foreground text-sm">
                  One quick step — we'll fill in your checkout for you
                </p>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="firstName" className="text-sm">First name</Label>
                    <div className="relative mt-1.5">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="firstName" name="firstName" placeholder="John" className="pl-10 h-10" value={formData.firstName} onChange={handleChange} required />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-sm">Last name</Label>
                    <Input id="lastName" name="lastName" placeholder="Doe" className="h-10 mt-1.5" value={formData.lastName} onChange={handleChange} required />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm">Email</Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" name="email" type="email" placeholder="you@example.com" className="pl-10 h-10" value={formData.email} onChange={handleChange} required />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm">Phone</Label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="phone" name="phone" type="tel" placeholder="(306) 555-0123" className="pl-10 h-10" value={formData.phone} onChange={handleChange} required />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address" className="text-sm">Delivery address (Regina)</Label>
                  <div className="relative mt-1.5">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="address" name="address" placeholder="123 Victoria Ave" className="pl-10 h-10" value={formData.address} onChange={handleChange} required />
                  </div>
                </div>

                <div>
                  <Label htmlFor="postalCode" className="text-sm">Postal code</Label>
                  <Input id="postalCode" name="postalCode" placeholder="S4R 6V6" className="h-10 mt-1.5 uppercase" value={formData.postalCode} onChange={handleChange} required />
                </div>

                <div>
                  <Label htmlFor="password" className="text-sm">Password</Label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="password" name="password" type="password" placeholder="Min 6 characters" className="pl-10 h-10" value={formData.password} onChange={handleChange} minLength={6} required />
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="age"
                    checked={ageConfirmed}
                    onCheckedChange={(c) => setAgeConfirmed(c as boolean)}
                    className="shrink-0 mt-[3px]"
                  />
                  <Label htmlFor="age" className="text-xs text-muted-foreground leading-5 cursor-pointer">
                    I confirm I am 19+ and agree to the{" "}
                    <Link to="/terms" className="text-primary hover:underline">Terms</Link> and{" "}
                    <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                  </Label>
                </div>

                <Button type="submit" className="w-full gap-2 h-10 rounded-full font-semibold" disabled={isLoading}>
                  {isLoading ? "Creating Account..." : <><span>Sign up</span><ArrowRight className="h-4 w-4" /></>}
                </Button>
              </form>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <Link to={`/login?redirect=${encodeURIComponent(redirectTo)}`}>
                  <Button variant="outline" className="w-full h-10 rounded-full font-semibold">Log in</Button>
                </Link>
                <Button className="w-full h-10 rounded-full font-semibold" disabled>Sign up</Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Signup;
