import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { subDays, format } from "date-fns";
import { ExternalLink, Newspaper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Flyer {
  id: string;
  store_name: string;
  source: string;
  title: string | null;
  image_url: string | null;
  flyer_url: string | null;
  valid_from: string | null;
  valid_to: string | null;
}

const formatRange = (from: string | null, to: string | null) => {
  if (!to) return "Current flyer";
  const end = new Date(to);
  if (!from) return `Ends ${format(end, "MMM d")}`;
  const start = new Date(from);
  return `${format(start, "MMM d")} – ${format(end, "MMM d")}`;
};

/**
 * Current store flyers, collected automatically from public flyer sites.
 * Renders nothing until at least one flyer has been collected, so the page
 * looks exactly as before while the collection is empty.
 */
const FlyerSection = () => {
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const from = subDays(new Date(), 21).toISOString().slice(0, 10);
    supabase
      .from("flyers")
      .select("id, store_name, source, title, image_url, flyer_url, valid_from, valid_to")
      .eq("is_active", true)
      .or(`valid_to.is.null,valid_to.gte.${from}`)
      .order("valid_to", { ascending: false, nullsFirst: false })
      .limit(12)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.error("flyers fetch failed:", error.message);
        setFlyers(data || []);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading || flyers.length === 0) return null;

  return (
    <section className="py-14" id="flyers">
      <div className="container max-w-5xl mx-auto px-4">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold font-heading">
              This Week's Store Flyers
            </h2>
            <p className="text-muted-foreground mt-1">
              Current flyers from Regina stores we deliver from, updated automatically.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/products">Shop flyer items</Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {flyers.map((f) => {
            const card = (
              <div className="border rounded-lg overflow-hidden h-full flex flex-col hover:border-primary/60 transition-colors">
                <div className="aspect-[3/4] bg-muted/50 flex items-center justify-center overflow-hidden">
                  {f.image_url ? (
                    <img
                      src={f.image_url}
                      alt={`${f.store_name} flyer`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Newspaper className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm leading-tight">{f.store_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatRange(f.valid_from, f.valid_to)}
                  </p>
                  {f.flyer_url && (
                    <span className="mt-2 inline-flex items-center gap-1 text-xs text-primary">
                      View flyer <ExternalLink className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </div>
            );
            return f.flyer_url ? (
              <a
                key={f.id}
                href={f.flyer_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                aria-label={`${f.store_name} flyer`}
              >
                {card}
              </a>
            ) : (
              <div key={f.id}>{card}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FlyerSection;
