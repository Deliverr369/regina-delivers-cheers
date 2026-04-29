import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, Pencil, Trash2, Star, Loader2 } from "lucide-react";
import { useAddresses, type SavedAddress } from "@/hooks/useAddresses";
import AddressFormDialog from "./AddressFormDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const AddressManager = () => {
  const { addresses, loading, create, update, remove, setDefault } = useAddresses();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SavedAddress | null>(null);

  const handleCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (addr: SavedAddress) => {
    setEditing(addr);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: any) => {
    try {
      if (editing) {
        await update(editing.id, data);
        toast({ title: "Address updated" });
      } else {
        await create(data);
        toast({ title: "Address added" });
      }
    } catch (err: any) {
      toast({
        title: "Could not save address",
        description: err.message,
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await remove(confirmDelete.id);
      toast({ title: "Address removed" });
    } catch (err: any) {
      toast({
        title: "Could not remove",
        description: err.message,
        variant: "destructive",
      });
    }
    setConfirmDelete(null);
  };

  const handleSetDefault = async (addr: SavedAddress) => {
    try {
      await setDefault(addr.id);
      toast({ title: `${addr.label} set as default` });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading addresses...
        </div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-6">
          <MapPin className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground mb-4">
            You don't have any saved addresses yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="rounded-xl border border-border bg-background p-3.5 flex gap-3 items-start"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">{addr.label}</p>
                  {addr.is_default && (
                    <Badge variant="secondary" className="text-[10px] h-5">
                      <Star className="h-2.5 w-2.5 mr-1 fill-current" /> Default
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{addr.address}</p>
                <p className="text-xs text-muted-foreground">
                  {addr.city}
                  {addr.postal_code ? `, ${addr.postal_code}` : ""}
                </p>
                {addr.delivery_instructions && (
                  <p className="text-[11px] text-muted-foreground/80 mt-1 italic truncate">
                    “{addr.delivery_instructions}”
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {!addr.is_default && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleSetDefault(addr)}
                    aria-label="Set as default"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEdit(addr)}
                  aria-label="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmDelete(addr)}
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full rounded-full"
        onClick={handleCreate}
      >
        <Plus className="h-4 w-4 mr-2" /> Add a new address
      </Button>

      <AddressFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSubmit={handleSubmit}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this address?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.label} — {confirmDelete?.address}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AddressManager;
