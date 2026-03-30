import ProductManagement from "@/components/admin/ProductManagement";

const DashboardProducts = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Product Management</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage products, pricing, and inventory across all stores</p>
      </div>
      <ProductManagement />
    </div>
  );
};

export default DashboardProducts;
