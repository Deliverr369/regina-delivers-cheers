import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SavedAddress {
  id: string;
  user_id: string;
  label: string;
  recipient_name: string | null;
  phone: string | null;
  address: string;
  unit: string | null;
  city: string;
  postal_code: string | null;
  delivery_instructions: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type AddressInput = Omit<
  SavedAddress,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export const useAddresses = () => {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("user_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (!error && data) setAddresses(data as SavedAddress[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = async (input: AddressInput) => {
    if (!user) throw new Error("Not signed in");
    const { data, error } = await supabase
      .from("user_addresses")
      .insert({ ...input, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    await refresh();
    return data as SavedAddress;
  };

  const update = async (id: string, patch: Partial<AddressInput>) => {
    const { error } = await supabase
      .from("user_addresses")
      .update(patch)
      .eq("id", id);
    if (error) throw error;
    await refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("user_addresses").delete().eq("id", id);
    if (error) throw error;
    await refresh();
  };

  const setDefault = async (id: string) => update(id, { is_default: true });

  return { addresses, loading, refresh, create, update, remove, setDefault };
};
