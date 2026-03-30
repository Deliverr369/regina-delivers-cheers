import { useState } from "react";
import ProductCatalog from "./ProductCatalog";
import ProductEditor from "./ProductEditor";

const ProductManagement = () => {
  const [editing, setEditing] = useState<{ name: string; category: string } | null>(null);

  if (editing) {
    return (
      <ProductEditor
        productName={editing.name}
        productCategory={editing.category}
        onBack={() => setEditing(null)}
      />
    );
  }

  return <ProductCatalog onEdit={(name, category) => setEditing({ name, category })} />;
};

export default ProductManagement;
