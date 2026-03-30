import { useState } from "react";
import { ImagePlus, DollarSign, Upload, Download, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useInventoryData, type ProductGroup } from "@/hooks/useInventoryData";
import InsightsCards from "@/components/inventory/InsightsCards";
import InventoryFiltersBar from "@/components/inventory/InventoryFiltersBar";
import InventoryTable from "@/components/inventory/InventoryTable";
import BulkActionsToolbar from "@/components/inventory/BulkActionsToolbar";
import ProductDetailDrawer from "@/components/inventory/ProductDetailDrawer";
import BulkPriceModal from "@/components/inventory/BulkPriceModal";
import BulkVariantModal from "@/components/inventory/BulkVariantModal";
import BulkImageUploadModal from "@/components/inventory/BulkImageUploadModal";
import StoreAssignmentModal from "@/components/inventory/StoreAssignmentModal";

const DashboardInventory = () => {
  const { toast } = useToast();
  const {
    loading, stores, packPrices, packsByProduct,
    groups, allGroups, insights, filters,
    updateFilter, resetFilters, selectedKeys, selectedGroups,
    toggleSelect, selectAll, clearSelection, fetchData,
  } = useInventoryData();

  const [detailGroup, setDetailGroup] = useState<ProductGroup | null>(null);
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [storeModalOpen, setStoreModalOpen] = useState(false);

  const handleQuickAction = async (action: string, group: ProductGroup) => {
    const ids = group.products.map(p => p.id);
    switch (action) {
      case "edit":
        // Navigate to product editor — we'll open the detail drawer which has a link
        setDetailGroup(group);
        break;
      case "toggle_visibility": {
        const newHidden = group.isVisible;
        await supabase.from("products").update({ is_hidden: newHidden }).in("id", ids);
        toast({ title: `${group.name} ${newHidden ? "hidden" : "shown"}` });
        fetchData();
        break;
      }
      case "toggle_stock": {
        const newStock = !group.inStock;
        await supabase.from("products").update({ in_stock: newStock }).in("id", ids);
        toast({ title: `${group.name} marked ${newStock ? "in stock" : "out of stock"}` });
        fetchData();
        break;
      }
    }
  };

  const handleOpenEditor = (name: string, category: string) => {
    // Navigate to existing product management page
    window.location.href = "/dashboard/products";
  };

  const handleExportAll = () => {
    const rows: string[] = ["Name,Category,Stores,Variants,Status,In Stock,Has Image,Has Pricing"];
    allGroups.forEach(g => {
      rows.push(`"${g.name}","${g.category}",${g.storeCount},${g.variantCount},"${g.isVisible ? "active" : "hidden"}","${g.inStock ? "yes" : "no"}","${g.hasImage ? "yes" : "no"}","${g.hasPricing ? "yes" : "no"}"`);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deliverr-full-inventory-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${allGroups.length} products exported` });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Inventory Operations Center</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage images, pricing, variants, stock, and store assignments
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs" onClick={() => setImageModalOpen(true)}>
            <ImagePlus className="h-3.5 w-3.5 mr-1.5" />Upload Images
          </Button>
          <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs" onClick={() => {
            if (selectedGroups.length > 0) setPriceModalOpen(true);
            else toast({ title: "Select products first", description: "Check products in the table to use bulk pricing", variant: "destructive" });
          }}>
            <DollarSign className="h-3.5 w-3.5 mr-1.5" />Bulk Pricing
          </Button>
          <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs" onClick={handleExportAll}>
            <Download className="h-3.5 w-3.5 mr-1.5" />Export
          </Button>
        </div>
      </div>

      {/* Insights */}
      <InsightsCards
        insights={insights}
        onFilter={(status) => updateFilter({ status })}
        activeStatus={filters.status}
      />

      {/* Filters */}
      <InventoryFiltersBar
        filters={filters}
        stores={stores}
        onUpdate={updateFilter}
        onReset={resetFilters}
        resultCount={groups.length}
        totalCount={allGroups.length}
        selectedCount={selectedKeys.size}
      />

      {/* Table */}
      <InventoryTable
        groups={groups}
        selectedKeys={selectedKeys}
        onToggleSelect={toggleSelect}
        onSelectAll={selectAll}
        onOpenDetail={(g) => setDetailGroup(g)}
        onQuickAction={handleQuickAction}
      />

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedGroups={selectedGroups}
        stores={stores}
        onClear={clearSelection}
        onRefresh={fetchData}
        onOpenPriceModal={() => setPriceModalOpen(true)}
        onOpenVariantModal={() => setVariantModalOpen(true)}
        onOpenImageUpload={() => setImageModalOpen(true)}
        onOpenStoreAssignment={() => setStoreModalOpen(true)}
      />

      {/* Detail Drawer */}
      <ProductDetailDrawer
        group={detailGroup}
        stores={stores}
        packsByProduct={packsByProduct}
        onClose={() => setDetailGroup(null)}
        onRefresh={() => { fetchData(); setDetailGroup(null); }}
        onOpenEditor={handleOpenEditor}
      />

      {/* Modals */}
      <BulkPriceModal
        open={priceModalOpen}
        onClose={() => setPriceModalOpen(false)}
        selectedGroups={selectedGroups.length > 0 ? selectedGroups : groups}
        stores={stores}
        packsByProduct={packsByProduct}
        onRefresh={fetchData}
      />

      <BulkVariantModal
        open={variantModalOpen}
        onClose={() => setVariantModalOpen(false)}
        selectedGroups={selectedGroups}
        stores={stores}
        packsByProduct={packsByProduct}
        onRefresh={fetchData}
      />

      <BulkImageUploadModal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        allGroups={allGroups}
        onRefresh={fetchData}
      />

      <StoreAssignmentModal
        open={storeModalOpen}
        onClose={() => setStoreModalOpen(false)}
        selectedGroups={selectedGroups}
        stores={stores}
        packsByProduct={packsByProduct}
        onRefresh={fetchData}
      />
    </div>
  );
};

export default DashboardInventory;
