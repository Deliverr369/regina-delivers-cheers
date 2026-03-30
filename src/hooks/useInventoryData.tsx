import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ProductCategory = Database["public"]["Enums"]["product_category"];

export interface InventoryProduct {
  id: string;
  name: string;
  category: ProductCategory;
  description: string | null;
  price: number;
  size: string | null;
  image_url: string | null;
  in_stock: boolean;
  is_hidden: boolean | null;
  display_order: number;
  store_id: string;
  created_at: string;
}

export interface PackPrice {
  id: string;
  product_id: string;
  pack_size: string;
  price: number;
  is_hidden: boolean;
}

export interface StoreInfo {
  id: string;
  name: string;
}

export interface ProductGroup {
  key: string;
  name: string;
  category: ProductCategory;
  description: string | null;
  image_url: string | null;
  storeCount: number;
  variantCount: number;
  products: InventoryProduct[];
  hasImage: boolean;
  hasPricing: boolean;
  inStock: boolean;
  isVisible: boolean;
  lastUpdated: string;
}

export interface InventoryFilters {
  search: string;
  category: string;
  storeId: string;
  status: string; // all | active | inactive | out_of_stock | missing_image | missing_price
  sortBy: string; // name | category | updated | price | stores
  sortDir: "asc" | "desc";
}

const defaultFilters: InventoryFilters = {
  search: "",
  category: "all",
  storeId: "all",
  status: "all",
  sortBy: "name",
  sortDir: "asc",
};

export const useInventoryData = () => {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [packPrices, setPackPrices] = useState<PackPrice[]>([]);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<InventoryFilters>(defaultFilters);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [productsRes, storesRes, packsRes] = await Promise.all([
      supabase.from("products").select("*").order("name"),
      supabase.from("stores").select("id, name").order("name"),
      supabase.from("product_pack_prices").select("*"),
    ]);
    setProducts((productsRes.data as InventoryProduct[]) || []);
    setStores(storesRes.data || []);
    setPackPrices((packsRes.data as PackPrice[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const packCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    packPrices.forEach(pp => {
      map[pp.product_id] = (map[pp.product_id] || 0) + 1;
    });
    return map;
  }, [packPrices]);

  const groups = useMemo(() => {
    const map: Record<string, ProductGroup> = {};
    products.forEach((p) => {
      const key = `${p.name.toLowerCase().trim()}::${p.category}`;
      if (!map[key]) {
        map[key] = {
          key,
          name: p.name,
          category: p.category,
          description: p.description,
          image_url: p.image_url,
          storeCount: 0,
          variantCount: 0,
          products: [],
          hasImage: false,
          hasPricing: false,
          inStock: false,
          isVisible: false,
          lastUpdated: p.created_at,
        };
      }
      const g = map[key];
      g.products.push(p);
      g.storeCount = g.products.length;
      if (p.image_url) { g.hasImage = true; g.image_url = p.image_url; }
      if (p.in_stock) g.inStock = true;
      if (!p.is_hidden) g.isVisible = true;
      if (p.created_at > g.lastUpdated) g.lastUpdated = p.created_at;
      const pc = packCountMap[p.id] || 0;
      if (pc > g.variantCount) g.variantCount = pc;
      if (pc > 0) g.hasPricing = true;
    });
    return Object.values(map);
  }, [products, packCountMap]);

  const filtered = useMemo(() => {
    let result = groups.filter((g) => {
      if (filters.search && !g.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.category !== "all" && g.category !== filters.category) return false;
      if (filters.storeId !== "all" && !g.products.some(p => p.store_id === filters.storeId)) return false;
      if (filters.status === "active" && !g.isVisible) return false;
      if (filters.status === "inactive" && g.isVisible) return false;
      if (filters.status === "out_of_stock" && g.inStock) return false;
      if (filters.status === "missing_image" && g.hasImage) return false;
      if (filters.status === "missing_price" && g.hasPricing) return false;
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (filters.sortBy) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "category": cmp = a.category.localeCompare(b.category); break;
        case "stores": cmp = a.storeCount - b.storeCount; break;
        case "updated": cmp = a.lastUpdated.localeCompare(b.lastUpdated); break;
        default: cmp = a.name.localeCompare(b.name);
      }
      return filters.sortDir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [groups, filters]);

  // Insights
  const insights = useMemo(() => ({
    total: groups.length,
    missingImages: groups.filter(g => !g.hasImage).length,
    missingPrices: groups.filter(g => !g.hasPricing).length,
    outOfStock: groups.filter(g => !g.inStock).length,
    inactive: groups.filter(g => !g.isVisible).length,
    noStores: groups.filter(g => g.storeCount === 0).length,
  }), [groups]);

  const toggleSelect = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedKeys.size === filtered.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(filtered.map(g => g.key)));
    }
  };

  const clearSelection = () => setSelectedKeys(new Set());

  const selectedGroups = useMemo(
    () => filtered.filter(g => selectedKeys.has(g.key)),
    [filtered, selectedKeys]
  );

  const updateFilter = (partial: Partial<InventoryFilters>) => {
    setFilters(prev => ({ ...prev, ...partial }));
  };

  const resetFilters = () => setFilters(defaultFilters);

  return {
    loading,
    stores,
    products,
    packPrices,
    groups: filtered,
    allGroups: groups,
    insights,
    filters,
    updateFilter,
    resetFilters,
    selectedKeys,
    selectedGroups,
    toggleSelect,
    selectAll,
    clearSelection,
    fetchData,
  };
};
