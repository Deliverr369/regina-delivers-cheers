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
  totalStores: number;
  variantCount: number;
  products: InventoryProduct[];
  hasImage: boolean;
  hasPricing: boolean;
  inStock: boolean;
  isVisible: boolean;
  lastUpdated: string;
  priceRange: { min: number; max: number } | null;
  hasPriceInconsistency: boolean;
}

export interface InventoryFilters {
  search: string;
  category: string;
  storeId: string;
  status: string;
  sortBy: string;
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
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InventoryFilters>(defaultFilters);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const PRODUCT_COLS =
      "id,name,category,description,price,size,image_url,in_stock,is_hidden,display_order,store_id,created_at";
    const PACK_COLS = "id,product_id,pack_size,price,is_hidden";
    const BATCH = 1000;

    // Keyset pagination on the primary key: stable, index-ordered and never
    // asks the database for a slow full-table sort or an exact row count.
    const fetchAllByKeyset = async <T extends { id: string }>(
      table: "products" | "product_pack_prices",
      cols: string
    ): Promise<T[]> => {
      const rows: T[] = [];
      let cursor: string | null = null;
      // Hard stop so a runaway loop can never hang the admin screen.
      for (let page = 0; page < 200; page++) {
        let q = supabase.from(table).select(cols).order("id").limit(BATCH);
        if (cursor) q = q.gt("id", cursor);
        const { data, error: err } = await q;
        if (err) throw err;
        const batch = (data as unknown as T[]) || [];
        rows.push(...batch);
        if (batch.length < BATCH) break;
        cursor = batch[batch.length - 1].id;
      }
      return rows;
    };

    try {
      const [storesRes, allProducts, allPacks] = await Promise.all([
        supabase.from("stores").select("id, name").order("name"),
        fetchAllByKeyset<InventoryProduct>("products", PRODUCT_COLS),
        fetchAllByKeyset<PackPrice>("product_pack_prices", PACK_COLS),
      ]);

      if (storesRes.error) throw storesRes.error;

      setProducts(allProducts);
      setStores(storesRes.data || []);
      setPackPrices(allPacks);
    } catch (e: any) {
      setError(
        e?.code === "57014"
          ? "The catalog took too long to load. Please try again."
          : e?.message || "Couldn't load inventory. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const packsByProduct = useMemo(() => {
    const map: Record<string, PackPrice[]> = {};
    packPrices.forEach(pp => {
      if (!map[pp.product_id]) map[pp.product_id] = [];
      map[pp.product_id].push(pp);
    });
    return map;
  }, [packPrices]);

  const groups = useMemo(() => {
    const map: Record<string, ProductGroup> = {};
    const totalStores = stores.length;

    products.forEach((p) => {
      const key = `${p.name.toLowerCase().trim()}::${p.category}`;
      if (!map[key]) {
        map[key] = {
          key,
          name: p.name,
          category: p.category,
          description: p.description,
          image_url: null,
          storeCount: 0,
          totalStores,
          variantCount: 0,
          products: [],
          hasImage: false,
          hasPricing: false,
          inStock: false,
          isVisible: false,
          lastUpdated: p.created_at,
          priceRange: null,
          hasPriceInconsistency: false,
        };
      }
      const g = map[key];
      g.products.push(p);
      g.storeCount = g.products.length;
      if (p.image_url) { g.hasImage = true; if (!g.image_url) g.image_url = p.image_url; }
      if (p.in_stock) g.inStock = true;
      if (!p.is_hidden) g.isVisible = true;
      if (p.created_at > g.lastUpdated) g.lastUpdated = p.created_at;
    });

    // Calculate variant counts and price ranges
    Object.values(map).forEach(g => {
      const allPrices: number[] = [];
      let maxVariants = 0;
      g.products.forEach(p => {
        const packs = packsByProduct[p.id] || [];
        if (packs.length > maxVariants) maxVariants = packs.length;
        if (packs.length > 0) g.hasPricing = true;
        packs.forEach(pp => { if (!pp.is_hidden) allPrices.push(pp.price); });
      });
      g.variantCount = maxVariants;
      if (allPrices.length > 0) {
        const min = Math.min(...allPrices);
        const max = Math.max(...allPrices);
        g.priceRange = { min, max };
        g.hasPriceInconsistency = max - min > 0.01;
      }
    });

    return Object.values(map);
  }, [products, stores, packsByProduct]);

  const filtered = useMemo(() => {
    let result = groups.filter((g) => {
      if (filters.search && !g.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.category !== "all" && g.category !== filters.category) return false;
      if (filters.storeId !== "all" && !g.products.some(p => p.store_id === filters.storeId)) return false;
      switch (filters.status) {
        case "active": if (!g.isVisible) return false; break;
        case "inactive": if (g.isVisible) return false; break;
        case "out_of_stock": if (g.inStock) return false; break;
        case "missing_image": if (g.hasImage) return false; break;
        case "missing_price": if (g.hasPricing) return false; break;
        case "price_inconsistency": if (!g.hasPriceInconsistency) return false; break;
      }
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (filters.sortBy) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "category": cmp = a.category.localeCompare(b.category); break;
        case "stores": cmp = a.storeCount - b.storeCount; break;
        case "updated": cmp = a.lastUpdated.localeCompare(b.lastUpdated); break;
        case "variants": cmp = a.variantCount - b.variantCount; break;
        default: cmp = a.name.localeCompare(b.name);
      }
      return filters.sortDir === "desc" ? -cmp : cmp;
    });
    return result;
  }, [groups, filters]);

  const insights = useMemo(() => ({
    total: groups.length,
    missingImages: groups.filter(g => !g.hasImage).length,
    missingPrices: groups.filter(g => !g.hasPricing).length,
    outOfStock: groups.filter(g => !g.inStock).length,
    inactive: groups.filter(g => !g.isVisible).length,
    priceInconsistencies: groups.filter(g => g.hasPriceInconsistency).length,
  }), [groups]);

  const toggleSelect = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedKeys(prev =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map(g => g.key))
    );
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
    loading, stores, products, packPrices, packsByProduct,
    groups: filtered, allGroups: groups, insights, filters,
    updateFilter, resetFilters, selectedKeys, selectedGroups,
    toggleSelect, selectAll, clearSelection, fetchData,
  };
};
