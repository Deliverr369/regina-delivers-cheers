import { Link } from "react-router-dom";

const points = [
  {
    h: "Regina's liquor stores in one place",
    p: "Shop Co-op Liquor, Sobeys Liquor, Superstore Liquor, Willow Park Wine & Spirits and Empire Offsale at store shelf prices.",
  },
  {
    h: "Delivered across Regina",
    p: "Downtown, Cathedral, Harbour Landing, Lakeview, Normanview, the East End and every neighbourhood in city limits. Free delivery over $50.",
  },
  {
    h: "Simple and safe",
    p: "One card hold when you order, charged only the final receipt amount. Valid 19+ photo ID checked at the door.",
  },
];

const ReginaLiquorIntro = () => (
  <section className="py-14 bg-muted/30">
    <div className="container mx-auto px-4 max-w-5xl">
      <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-3">
        Liquor delivery in Regina, made easy
      </h2>
      <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10">
        Deliverr is a local Regina service that picks up beer, wine, spirits and smokes from the stores you already
        know and brings them to your door — usually within an hour.
      </p>
      <div className="grid gap-6 md:grid-cols-3">
        {points.map((x) => (
          <div key={x.h} className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold text-lg mb-2">{x.h}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{x.p}</p>
          </div>
        ))}
      </div>
      <p className="text-center mt-8 text-sm">
        <Link to="/liquor-stores-regina" className="text-primary font-semibold underline-offset-4 hover:underline">
          Compare Regina liquor stores
        </Link>
        {" · "}
        <Link to="/liquor-delivery-regina" className="text-primary font-semibold underline-offset-4 hover:underline">
          Liquor delivery Regina
        </Link>
        {" · "}
        <Link to="/delivery/regina" className="text-primary font-semibold underline-offset-4 hover:underline">
          Delivery areas
        </Link>
      </p>
    </div>
  </section>
);

export default ReginaLiquorIntro;
