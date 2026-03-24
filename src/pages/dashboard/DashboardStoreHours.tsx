import StoreHoursManagement from "@/components/admin/StoreHoursManagement";

const DashboardStoreHours = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Store Hours</h2>
      <StoreHoursManagement />
    </div>
  );
};

export default DashboardStoreHours;
