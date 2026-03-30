import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import logo from "@/assets/deliverr-logo.png";

const Login = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const { error } = await signIn(formData.email, formData.password);
    if (error) {
      setError(error.message);
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
                  Welcome Back
                </h1>
                <p className="text-muted-foreground text-sm">
                  Log in to your account
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
                  <Label htmlFor="email" className="text-sm">Email</Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email" name="email" type="email" placeholder="you@example.com"
                      className="pl-10 h-10" value={formData.email} onChange={handleChange} required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password" className="text-sm">Password</Label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password" name="password" type="password" placeholder="Enter your password"
                      className="pl-10 h-10" value={formData.password} onChange={handleChange} required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full gap-2 h-10 rounded-full font-semibold" disabled={isLoading}>
                  {isLoading ? "Logging in..." : <><span>Log In</span><ArrowRight className="h-4 w-4" /></>}
                </Button>
              </form>

              <p className="text-center text-muted-foreground text-sm mt-5">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary hover:underline font-medium">Sign up</Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
