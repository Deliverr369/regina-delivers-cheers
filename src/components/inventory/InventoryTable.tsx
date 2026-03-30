import { memo } from "react";
import {
  Image as ImageIcon, Eye, EyeOff, MoreHorizontal, Store, ArrowLeftRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ProductGroup } from "@/hooks/useInventoryData";
import { formatDistanceToNow } from "date-fns";

const CATEGORY_BADGE: Record<string, { emoji: string; className: string }> = {
  beer: { emoji: "🍺", className: "bg-amber-500/10 text-amber-700 border-amber-200" },
  wine: { emoji: "🍷", className: "bg-rose-500/10 text-rose-700 border-rose-200" },
  spirits: { emoji: "🥃", className: "bg-sky-500/10 text-sky-700 border-sky-200" },
  smokes: { emoji: "🚬", className: "bg-slate-500/10 text-slate-700 border-slate-200" },
};

interface Props {
  groups: ProductGroup[];
  selectedKeys: Set<string>;
  onToggleSelect: (key: string) => void;
  onSelectAll: () => void;
  onOpenDetail: (group: ProductGroup) => void;
  onQuickAction: (action: string, group: ProductGroup) => void;
}

const InventoryTable = memo(({ groups, selectedKeys, onToggleSelect, onSelectAll, onOpenDetail, onQuickAction }: Props) => {
  const allSelected = groups.length > 0 && selectedKeys.size === groups.length;
  const someSelected = selectedKeys.size > 0 && selectedKeys.size < groups.length;

  return (
    <div className="border border-border/40 rounded-xl overflow-hidden bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/20 hover:bg-muted/20 border-b border-border/40">
            <TableHead className="w-10 pl-4">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onSelectAll}
                className={someSelected ? "data-[state=checked]:bg-primary" : ""}
              />
            </TableHead>
            <TableHead className="w-11" />
            <TableHead className="font-semibold text-xs">Product</TableHead>
            <TableHead className="w-[90px] font-semibold text-xs">Category</TableHead>
            <TableHead className="w-[70px] text-center font-semibold text-xs">Stores</TableHead>
            <TableHead className="w-[70px] text-center font-semibold text-xs">Sizes</TableHead>
            <TableHead className="w-[120px] font-semibold text-xs">Price Range</TableHead>
            <TableHead className="w-[85px] font-semibold text-xs">Status</TableHead>
            <TableHead className="w-[100px] font-semibold text-xs">Updated</TableHead>
            <TableHead className="w-[40px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-20">
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon className="h-10 w-10 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground font-medium">No products match your filters</p>
                  <p className="text-xs text-muted-foreground/70">Try adjusting your search or filter criteria</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            groups.map((g) => {
              const cat = CATEGORY_BADGE[g.category] || CATEGORY_BADGE.beer;
              const isSelected = selectedKeys.has(g.key);
              return (
                <TableRow
                  key={g.key}
                  className={`cursor-pointer transition-all border-b border-border/30 ${
                    isSelected ? "bg-primary/[0.03]" : "hover:bg-muted/30"
                  }`}
                  onClick={() => onOpenDetail(g)}
                >
                  <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(g.key)} />
                  </TableCell>
                  <TableCell className="pr-0">
                    <div className={`h-9 w-9 rounded-lg overflow-hidden flex-shrink-0 border transition-colors ${
                      isSelected ? "border-primary/30" : "border-border/30"
                    } ${g.hasImage ? "bg-white" : "bg-muted/30"}`}>
                      {g.image_url ? (
                        <img src={g.image_url} alt="" className="h-full w-full object-contain p-0.5" loading="lazy" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground/25" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate max-w-[280px]">{g.name}</p>
                      {g.description && (
                        <p className="text-[11px] text-muted-foreground truncate max-w-[280px] mt-0.5">{g.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] h-5 capitalize font-normal border ${cat.className}`}>
                      {cat.emoji} {g.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Tooltip>
                      <TooltipTrigger>
                        <span className={`text-sm font-medium tabular-nums ${
                          g.storeCount === g.totalStores ? "text-emerald-600" : g.storeCount === 0 ? "text-destructive" : "text-foreground"
                        }`}>
                          {g.storeCount}/{g.totalStores}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        Assigned to {g.storeCount} of {g.totalStores} stores
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`text-sm tabular-nums ${g.variantCount === 0 ? "text-muted-foreground" : "font-medium"}`}>
                      {g.variantCount}
                    </span>
                  </TableCell>
                  <TableCell>
                    {g.priceRange ? (
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium tabular-nums text-foreground">
                          ${g.priceRange.min.toFixed(2)}
                        </span>
                        {g.hasPriceInconsistency && (
                          <Tooltip>
                            <TooltipTrigger>
                              <ArrowLeftRight className="h-3 w-3 text-violet-500" />
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                              Price varies: ${g.priceRange.min.toFixed(2)} – ${g.priceRange.max.toFixed(2)}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {g.isVisible ? (
                        <Badge className="text-[10px] h-5 bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/10 font-normal">
                          <Eye className="h-2.5 w-2.5 mr-0.5" />Live
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] h-5 font-normal">
                          <EyeOff className="h-2.5 w-2.5 mr-0.5" />Hidden
                        </Badge>
                      )}
                      {!g.inStock && (
                        <Badge variant="destructive" className="text-[10px] h-5 font-normal">OOS</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(g.lastUpdated), { addSuffix: false })}
                    </span>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-50 hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => onOpenDetail(g)}>View Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onQuickAction("edit", g)}>Edit in Product Editor</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onQuickAction("toggle_visibility", g)}>
                          {g.isVisible ? "Hide Product" : "Show Product"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onQuickAction("toggle_stock", g)}>
                          {g.inStock ? "Mark Out of Stock" : "Mark In Stock"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
});

InventoryTable.displayName = "InventoryTable";

export default InventoryTable;
