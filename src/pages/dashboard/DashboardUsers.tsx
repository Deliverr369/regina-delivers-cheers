import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

const DashboardUsers = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="text-muted-foreground">Loading users...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">User Management</h2>

      <Card>
        <CardHeader>
          <CardTitle>Registered Users ({profiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No users found.</p>
          ) : (
            <div className="space-y-3">
              {profiles.map((profile) => {
                const userRoles = getUserRoles(profile.id);
                return (
                  <div key={profile.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground">{profile.full_name || "Unnamed"}</p>
                        {userRoles.map((r) => (
                          <Badge key={r.role} variant="secondary" className="capitalize">{r.role}</Badge>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">{profile.email}</p>
                      {profile.phone && <p className="text-xs text-muted-foreground">📞 {profile.phone}</p>}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{profile.address ? `${profile.address}, ${profile.city}` : "No address"}</p>
                      <p className="text-xs">Joined {new Date(profile.created_at).toLocaleDateString()}</p>
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
