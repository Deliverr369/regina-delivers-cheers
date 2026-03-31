import { useState, useEffect } from "react";
import { Clock, Globe, ExternalLink, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface ImportSession {
  id: string;
  source_url: string;
  source_domain: string | null;
  source_name: string | null;
  import_type: string;
  status: string;
  total_scanned: number;
  approved_count: number;
  rejected_count: number;
  imported_count: number;
  failed_count: number;
  created_at: string;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  scanning: { label: "Scanning", className: "bg-amber-500/10 text-amber-600 border-amber-200" },
  review: { label: "In Review", className: "bg-primary/10 text-primary border-primary/20" },
  completed: { label: "Completed", className: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

interface Props {
  onOpenSession: (id: string) => void;
}

const ImportHistory = ({ onOpenSession }: Props) => {
  const [sessions, setSessions] = useState<ImportSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("import_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setSessions((data as any[]) || []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-20">
        <Clock className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground font-medium">No import history yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Your scan and import sessions will appear here</p>
      </div>
    );
  }

  return (
    <div className="border border-border/40 rounded-xl overflow-hidden bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/20 hover:bg-muted/20">
            <TableHead className="text-xs font-semibold">Source</TableHead>
            <TableHead className="w-[90px] text-xs font-semibold">Type</TableHead>
            <TableHead className="w-[80px] text-xs font-semibold">Status</TableHead>
            <TableHead className="w-[60px] text-xs font-semibold text-center">Scanned</TableHead>
            <TableHead className="w-[60px] text-xs font-semibold text-center">Imported</TableHead>
            <TableHead className="w-[100px] text-xs font-semibold">Date</TableHead>
            <TableHead className="w-[70px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map(s => {
            const status = STATUS_BADGE[s.status] || STATUS_BADGE.review;
            return (
              <TableRow key={s.id} className="border-b border-border/30 hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate max-w-[250px]">
                        {s.source_name || s.source_domain}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[250px]">{s.source_url}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-[10px] h-5 font-normal capitalize">
                    {s.import_type.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] h-5 font-normal ${status.className}`}>
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm tabular-nums">{s.total_scanned}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm tabular-nums">{s.imported_count}</span>
                </TableCell>
                <TableCell>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => onOpenSession(s.id)}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />Open
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default ImportHistory;
