import { Image as ImageIcon, Eye, EyeOff, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { ProductGroup } from "@/hooks/useInventoryData";

const CATEGORY_EMOJI: Record<string, string> = {
  beer: "🍺", wine: "🍷", spirits: "🥃", smokes: "🚬",
};

interface Props {
  groups: ProductGroup[];
  selectedKeys: Set<string>;
  onToggleSelect: (key: string) => void;
  onSelectAll: () => void;
  onOpenDetail: (group: ProductGroup) => void;
}

const InventoryTable = ({ groups, selectedKeys, onToggleSelect, onSelectAll, onOpenDetail }: Props) => {
  const allSelected = groups.length > 0 && selectedKeys.size === groups.length;

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={onSelectAll} />
            </TableHead>
            <TableHead className="w-12" />
            <TableHead>Product</TableHead>
            <TableHead className="w-[100px]">Category</TableHead>
            <TableHead className="w-[80px] text-center">Stores</TableHead>
            <TableHead className="w-[80px] text-center">Sizes</TableHead>
            <TableHead className="w-[90px]">Status</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                No products match your filters
              </TableCell>
            </TableRow>
          ) : (
            groups.map((g) => (
              <TableRow
                key={g.key}
                className={`cursor-pointer transition-colors ${selectedKeys.has(g.key) ? "bg-primary/5" : ""}`}
                onClick={() => onOpenDetail(g)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedKeys.has(g.key)}
                    onCheckedChange={() => onToggleSelect(g.key)}
                  />
                </TableCell>
                <TableCell>
                  <div className="h-9 w-9 rounded-lg bg-muted/50 overflow-hidden flex-shrink-0">
                    {g.image_url ? (
                      <img src={g.image_url} alt={g.name} className="h-full w-full object-contain p-0.5" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-sm text-foreground truncate max-w-[250px]">{g.name}</p>
                  {g.description && (
                    <p className="text-[11px] text-muted-foreground truncate max-w-[250px]">{g.description}</p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] h-5 capitalize font-normal">
                    {CATEGORY_EMOJI[g.category]} {g.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm font-medium">{g.storeCount}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm font-medium">{g.variantCount}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {g.isVisible ? (
                      <Badge className="text-[10px] h-5 bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/10">
                        <Eye className="h-3 w-3 mr-0.5" />Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] h-5">
                        <EyeOff className="h-3 w-3 mr-0.5" />Hidden
                      </Badge>
                    )}
                    {!g.inStock && (
                      <Badge variant="destructive" className="text-[10px] h-5">OOS</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onOpenDetail(g)}>View Details</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggleSelect(g.key)}>
                        {selectedKeys.has(g.key) ? "Deselect" : "Select"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default InventoryTable;
