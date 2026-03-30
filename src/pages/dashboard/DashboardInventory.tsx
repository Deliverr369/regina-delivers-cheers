import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInventoryData, type ProductGroup } from "@/hooks/useInventoryData";
import InsightsCards from "@/components/inventory/InsightsCards";
import InventoryFiltersBar from "@/components/inventory/InventoryFiltersBar";
import InventoryTable from "@/components/inventory/InventoryTable";
import BulkActionsToolbar from "@/components/inventory/BulkActionsToolbar";
import ProductDetailDrawer from "@/components/inventory/ProductDetailDrawer";
import ProductManagement from "@/components/admin/ProductManagement";

const DashboardInventory = () => {
  const {
    loading, stores, packPrices, groups, insights, filters,
    updateFilter, resetFilters, selectedKeys, selectedGroups,
    toggleSelect, selectAll, clearSelection, fetchData,
  } = useInventoryData();

  const [detailGroup, setDetailGroup] = useState<ProductGroup | null>(null);
  const [editorView, setEditorView] = useState<{ name: string; category: string } | null>(null);

  // If editing a product in full editor, show that
  if (editorView) {
    return (
      <div className="space-y-6">
        <ProductManagement />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Catalog Operations</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage products, pricing, and inventory across all stores</p>
        </div>
        <Button className="rounded-xl h-9" onClick={() => setEditorView({ name: "", category: "" })}>
          <Plus className="h-4 w-4 mr-1.5" />Add Product
        </Button>
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
      />

      {/* Table */}
      <InventoryTable
        groups={groups}
        selectedKeys={selectedKeys}
        onToggleSelect={toggleSelect}
        onSelectAll={selectAll}
        onOpenDetail={(g) => setDetailGroup(g)}
      />

      {/* Bulk Actions */}
      <BulkActionsToolbar
        selectedGroups={selectedGroups}
        stores={stores}
        onClear={clearSelection}
        onRefresh={fetchData}
      />

      {/* Detail Drawer */}
      <ProductDetailDrawer
        group={detailGroup}
        stores={stores}
        packPrices={packPrices}
        onClose={() => setDetailGroup(null)}
        onRefresh={() => { fetchData(); setDetailGroup(null); }}
        onOpenEditor={(name, category) => setEditorView({ name, category })}
      />
    </div>
  );
};

export default DashboardInventory;
