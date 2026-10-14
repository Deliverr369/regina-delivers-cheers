import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export type Crumb = { name: string; path: string };

const SITE = "https://deliverr.ca";

export const breadcrumbJsonLd = (crumbs: Crumb[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((c, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: c.name,
    item: `${SITE}${c.path}`,
  })),
});

export const PageBreadcrumbs = ({ crumbs, className = "" }: { crumbs: Crumb[]; className?: string }) => (
  <nav aria-label="Breadcrumb" className={`text-sm text-muted-foreground ${className}`}>
    <ol className="flex flex-wrap items-center gap-1">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <li key={c.path} className="flex items-center gap-1 min-w-0">
            {last ? (
              <span aria-current="page" className="text-foreground font-medium truncate max-w-[60vw]">{c.name}</span>
            ) : (
              <Link to={c.path} className="hover:text-primary">{c.name}</Link>
            )}
            {!last && <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />}
          </li>
        );
      })}
    </ol>
  </nav>
);
