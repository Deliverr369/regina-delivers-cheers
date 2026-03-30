import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search, Mail, Phone, MapPin } from "lucide-react";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

const roleColors: Record<string, string> = {
  admin: "bg-primary/10 text-primary",
  moderator: "bg-violet-100 text-violet-800",
  user: "bg-muted text-muted-foreground",
};

const DashboardUsers = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    if (profilesRes.error) {
      toast({ title: "Error", description: "Failed to fetch users", variant: "destructive" });
    }
    setProfiles(profilesRes.data || []);
    setRoles(rolesRes.data || []);
    setLoading(false);
  };

  const getUserRoles = (userId: string) => roles.filter((r) => r.user_id === userId);

  const filtered = profiles.filter((p) => {
    if (search === "") return true;
    const s = search.toLowerCase();
    return (p.full_name?.toLowerCase().includes(s)) || (p.email?.toLowerCase().includes(s)) || (p.phone?.includes(s));
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">User Management</h2>
        <p className="text-sm text-muted-foreground mt-1">View and manage registered users</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Registered Users ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No users found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((profile) => {
                const userRoles = getUserRoles(profile.id);
                return (
                  <div key={profile.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-semibold text-xs">
                            {(profile.full_name || "U")[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{profile.full_name || "Unnamed"}</p>
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">{profile.email}</p>
                          </div>
                        </div>
                        {userRoles.map((r) => (
                          <Badge key={r.role} className={`${roleColors[r.role] || roleColors.user} capitalize text-[10px] border-0`}>
                            {r.role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {profile.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{profile.phone}</span>
                        </div>
                      )}
                      {profile.address && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{profile.city || profile.address}</span>
                        </div>
                      )}
                      <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardUsers;
