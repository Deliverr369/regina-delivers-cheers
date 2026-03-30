import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { User, MapPin, Phone, CreditCard, Mail, Save, Loader2 } from "lucide-react";

interface ProfileData {
  full_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
}

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "", email: "", phone: "", address: "", city: "Regina", postal_code: "",
  });

  useEffect(() => {
    if (!authLoading && !user) { navigate("/login"); return; }
    if (user) fetchProfile();
  }, [user, authLoading]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (data) {
      setProfile({
        full_name: data.full_name || "", email: data.email || user.email || "",
        phone: data.phone || "", address: data.address || "",
        city: data.city || "Regina", postal_code: data.postal_code || "",
      });
    } else {
      setProfile((prev) => ({ ...prev, email: user.email || "" }));
    }
    setLoading(false);
  };

  const handleChange = (field: keyof ProfileData, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name, phone: profile.phone,
      address: profile.address, city: profile.city, postal_code: profile.postal_code,
    }).eq("id", user.id);

    toast(error
      ? { title: "Error", description: "Failed to update profile.", variant: "destructive" as const }
      : { title: "Profile Updated", description: "Your profile has been saved." }
    );
    setSaving(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-16">
        <div className="bg-secondary/50 border-b border-border">
          <div className="container mx-auto px-4 py-8">
            <h1 className="font-display text-3xl font-bold text-foreground mb-1">My Profile</h1>
            <p className="text-muted-foreground text-sm">{profile.email}</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 max-w-2xl">
          {/* Personal Information */}
          <div className="bg-card rounded-2xl border border-border p-6 mb-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-4.5 w-4.5 text-primary" />
              </div>
              <h2 className="font-display text-lg font-bold text-foreground">Personal Information</h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="full_name" className="text-sm">Full Name</Label>
                <Input id="full_name" value={profile.full_name} onChange={(e) => handleChange("full_name", e.target.value)} placeholder="Enter your full name" className="mt-1.5 h-10" />
              </div>
              <div>
                <Label className="text-sm">Email</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input value={profile.email} disabled className="bg-muted h-10" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm">Phone Number</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input id="phone" value={profile.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="(306) 555-0123" className="h-10" />
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-card rounded-2xl border border-border p-6 mb-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapPin className="h-4.5 w-4.5 text-primary" />
              </div>
              <h2 className="font-display text-lg font-bold text-foreground">Delivery Address</h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="address" className="text-sm">Street Address</Label>
                <Input id="address" value={profile.address} onChange={(e) => handleChange("address", e.target.value)} placeholder="123 Main St" className="mt-1.5 h-10" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">City</Label>
                  <Input value={profile.city} disabled className="bg-muted mt-1.5 h-10" />
                  <p className="text-xs text-muted-foreground mt-1">Regina only</p>
                </div>
                <div>
                  <Label htmlFor="postal_code" className="text-sm">Postal Code</Label>
                  <Input id="postal_code" value={profile.postal_code} onChange={(e) => handleChange("postal_code", e.target.value)} placeholder="S4X 1A1" className="mt-1.5 h-10" />
                </div>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-card rounded-2xl border border-border p-6 mb-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-4.5 w-4.5 text-primary" />
              </div>
              <h2 className="font-display text-lg font-bold text-foreground">Payment Method</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">No saved cards yet.</p>
            <Button variant="outline" className="w-full h-10 rounded-xl" disabled>
              <CreditCard className="h-4 w-4 mr-2" /> Add Card — Coming Soon
            </Button>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-full font-semibold" size="lg">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
