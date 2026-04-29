import { Link } from "react-router-dom";

export const NEIGHBORHOOD_LINKS: { slug: string; name: string }[] = [
  { slug: "downtown", name: "Downtown" },
  { slug: "cathedral", name: "Cathedral" },
  { slug: "harbour-landing", name: "Harbour Landing" },
  { slug: "lakeview", name: "Lakeview" },
  { slug: "albert-park", name: "Albert Park" },
  { slug: "hillsdale", name: "Hillsdale" },
  { slug: "eastview", name: "Eastview" },
  { slug: "whitmore-park", name: "Whitmore Park" },
  { slug: "the-crescents", name: "The Crescents" },
  { slug: "north-central", name: "North Central" },
  { slug: "south-end", name: "South End" },
  { slug: "east-end", name: "East End" },
  { slug: "west-end", name: "West End" },
  { slug: "uplands", name: "Uplands" },
  { slug: "normanview", name: "Normanview" },
];

export const CATEGORY_LINKS: { slug: string; name: string }[] = [
  { slug: "alcohol-delivery-regina", name: "Alcohol Delivery" },
  { slug: "beer-delivery-regina", name: "Beer Delivery" },
  { slug: "wine-delivery-regina", name: "Wine Delivery" },
  { slug: "liquor-delivery-regina", name: "Liquor Delivery" },
  { slug: "grocery-delivery-regina", name: "Grocery Delivery" },
  { slug: "smokes-delivery-regina", name: "Smokes & Vape Delivery" },
];

type Props = {
  /** Neighborhood slug to exclude (current page) */
  excludeNeighborhood?: string;
  /** Category slug to exclude (current page) */
  excludeCategory?: string;
};

const InternalLinksSection = ({ excludeNeighborhood, excludeCategory }: Props) => {
  const hoods = NEIGHBORHOOD_LINKS.filter((n) => n.slug !== excludeNeighborhood);
  const cats = CATEGORY_LINKS.filter((c) => c.slug !== excludeCategory);

  return (
    <section className="py-16 bg-muted/30" aria-label="Related delivery pages">
      <div className="container max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-10">
        {/* Neighborhoods */}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2 font-heading">
            Explore Nearby Neighborhoods
          </h2>
          <p className="text-muted-foreground mb-6">
            Same-day delivery across every Regina neighborhood.
          </p>
          <ul className="grid grid-cols-2 gap-2">
            {hoods.map((n) => (
              <li key={n.slug}>
                <Link
                  to={`/delivery/regina/${n.slug}`}
                  className="block border rounded-md px-3 py-2 text-sm hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  {n.name} delivery
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Categories */}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2 font-heading">
            More Delivery Categories
          </h2>
          <p className="text-muted-foreground mb-6">
            Shop alcohol, groceries, smokes and more — delivered in under an hour.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {cats.map((c) => (
              <li key={c.slug}>
                <Link
                  to={`/${c.slug}`}
                  className="block border rounded-md px-3 py-2 text-sm hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  {c.name} in Regina
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default InternalLinksSection;
