import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { InventoryFilters, StoreInfo } from "@/hooks/useInventoryData";

const CATEGORIES = [
  { value: "beer", emoji: "🍺", label: "Beer" },
  { value: "wine", emoji: "🍷", label: "Wine" },
  { value: "spirits", emoji: "🥃", label: "Spirits" },
  { value: "smokes", emoji: "🚬", label: "Smokes" },
];

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "category", label: "Category" },
  { value: "stores", label: "Stores" },
  { value: "variants", label: "Variants" },
  { value: "updated", label: "Updated" },
];

interface Props {
  filters: InventoryFilters;
  stores: StoreInfo[];
  onUpdate: (partial: Partial<InventoryFilters>) => void;
  onReset: () => void;
  resultCount: number;
  totalCount: number;
  selectedCount: number;
}

const InventoryFiltersBar = ({ filters, stores, onUpdate, onReset, resultCount, totalCount, selectedCount }: Props) => {
  const hasFilters = filters.search || filters.category !== "all" || filters.storeId !== "all" || filters.status !== "all";
  const isFiltered = resultCount !== totalCount;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-col lg:flex-row gap-2.5">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={filters.search}
            onChange={(e) => onUpdate({ search: e.target.value })}
            className="pl-9 h-9 bg-card border-border/50"
          />
          {filters.search && (
            <button onClick={() => onUpdate({ search: "" })} className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex gap-2 flex-wrap items-center">
          <Select value={filters.category} onValueChange={(v) => onUpdate({ category: v })}>
            <SelectTrigger className="w-[130px] h-9 text-xs bg-card border-border/50">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.storeId} onValueChange={(v) => onUpdate({ storeId: v })}>
            <SelectTrigger className="w-[150px] h-9 text-xs bg-card border-border/50">
              <SelectValue placeholder="Store" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center border border-border/50 rounded-lg bg-card h-9 px-1">
            <Select value={filters.sortBy} onValueChange={(v) => onUpdate({ sortBy: v })}>
              <SelectTrigger className="border-0 h-7 text-xs w-[90px] p-0 px-2 shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-xs font-bold"
              onClick={() => onUpdate({ sortDir: filters.sortDir === "asc" ? "desc" : "asc" })}
            >
              {filters.sortDir === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground">{resultCount}</span> product{resultCount !== 1 ? "s" : ""}
          {isFiltered && <span className="text-muted-foreground"> of {totalCount}</span>}
        </span>
        {selectedCount > 0 && (
          <>
            <span className="h-1 w-1 rounded-full bg-border" />
            <Badge variant="secondary" className="text-[10px] h-5 font-normal">
              {selectedCount} selected
            </Badge>
          </>
        )}
        {hasFilters && (
          <>
            <span className="h-1 w-1 rounded-full bg-border" />
            <button onClick={onReset} className="text-primary hover:underline flex items-center gap-1">
              <Filter className="h-3 w-3" />Clear filters
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default InventoryFiltersBar;
