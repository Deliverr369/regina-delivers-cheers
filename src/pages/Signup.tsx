import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import logo from "@/assets/deliverr-logo.png";

const Signup = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "" });

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
    setIsLoading(true);
    setError(null);
    const { error } = await signUp(formData.email, formData.password, formData.fullName);
    if (error) {
      setError(error.message.includes("already registered")
        ? "This email is already registered. Please log in instead."
        : error.message);
      setIsLoading(false);
    } else {
      navigate("/stores");
    }
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
                  Join Deliverr for fast liquor delivery
                </p>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="fullName" className="text-sm">Full Name</Label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="fullName" name="fullName" placeholder="John Doe" className="pl-10 h-10" value={formData.fullName} onChange={handleChange} required />
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
                  <Label htmlFor="password" className="text-sm">Password</Label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="password" name="password" type="password" placeholder="Min 6 characters" className="pl-10 h-10" value={formData.password} onChange={handleChange} minLength={6} required />
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Checkbox id="age" checked={ageConfirmed} onCheckedChange={(c) => setAgeConfirmed(c as boolean)} className="mt-0.5 shrink-0" />
                  <Label htmlFor="age" className="text-xs text-muted-foreground leading-relaxed">
                    I confirm I am 19+ and agree to the{" "}
                    <Link to="/terms" className="text-primary hover:underline">Terms</Link> and{" "}
                    <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                  </Label>
                </div>

                <Button type="submit" className="w-full gap-2 h-10 rounded-full font-semibold" disabled={isLoading}>
                  {isLoading ? "Creating Account..." : <><span>Create Account</span><ArrowRight className="h-4 w-4" /></>}
                </Button>
              </form>

              <p className="text-center text-muted-foreground text-sm mt-5">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">Log in</Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Signup;
