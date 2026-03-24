import ProductManagement from "@/components/admin/ProductManagement";

const DashboardProducts = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Product Management</h2>
      <ProductManagement />
    </div>
  );
};

export default DashboardProducts;
