import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { InventoryFilters, StoreInfo } from "@/hooks/useInventoryData";

const CATEGORY_EMOJI: Record<string, string> = {
  beer: "🍺", wine: "🍷", spirits: "🥃", smokes: "🚬",
};

interface Props {
  filters: InventoryFilters;
  stores: StoreInfo[];
  onUpdate: (partial: Partial<InventoryFilters>) => void;
  onReset: () => void;
  resultCount: number;
}

const InventoryFiltersBar = ({ filters, stores, onUpdate, onReset, resultCount }: Props) => {
  const hasFilters = filters.search || filters.category !== "all" || filters.storeId !== "all" || filters.status !== "all";

  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={filters.search}
            onChange={(e) => onUpdate({ search: e.target.value })}
            className="pl-9 h-9 bg-card"
          />
          {filters.search && (
            <button onClick={() => onUpdate({ search: "" })} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Select value={filters.category} onValueChange={(v) => onUpdate({ category: v })}>
            <SelectTrigger className="w-[140px] h-9 text-sm bg-card">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {(["beer", "wine", "spirits", "smokes"] as const).map(cat => (
                <SelectItem key={cat} value={cat}>{CATEGORY_EMOJI[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.storeId} onValueChange={(v) => onUpdate({ storeId: v })}>
            <SelectTrigger className="w-[160px] h-9 text-sm bg-card">
              <SelectValue placeholder="Store" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.sortBy} onValueChange={(v) => onUpdate({ sortBy: v })}>
            <SelectTrigger className="w-[130px] h-9 text-sm bg-card">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="category">Category</SelectItem>
              <SelectItem value="stores">Store Count</SelectItem>
              <SelectItem value="updated">Last Updated</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2"
            onClick={() => onUpdate({ sortDir: filters.sortDir === "asc" ? "desc" : "asc" })}
          >
            {filters.sortDir === "asc" ? "↑" : "↓"}
          </Button>
        </div>
      </div>

      {/* Active filters summary */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium">{resultCount} product{resultCount !== 1 ? "s" : ""}</span>
        {hasFilters && (
          <>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <button onClick={onReset} className="text-primary hover:underline">Clear all filters</button>
          </>
        )}
      </div>
    </div>
  );
};

export default InventoryFiltersBar;
