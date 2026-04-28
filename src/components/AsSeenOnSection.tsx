import globalRegina from "@/assets/press-global-regina.png";
import cbc from "@/assets/press-cbc.png";
import innovationSk from "@/assets/press-innovation-sk.png";
import morningstar from "@/assets/press-morningstar.png";
import marketsInsider from "@/assets/press-markets-insider.png";
import canadianInsider from "@/assets/press-canadian-insider.png";

const pressLogos = [
  { name: "Global Regina", src: globalRegina },
  { name: "CBC Saskatchewan", src: cbc },
  { name: "Innovation Saskatchewan", src: innovationSk },
  { name: "Morningstar", src: morningstar },
  { name: "Markets Insider", src: marketsInsider },
  { name: "Canadian Insider", src: canadianInsider },
];

const AsSeenOnSection = () => {
  return (
    <section className="py-14 md:py-20 bg-background border-t border-border">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10 md:mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/15 text-[hsl(var(--primary-strong))] text-xs font-semibold tracking-widest uppercase mb-4">
            Press
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            As seen on
          </h2>
          <div className="mt-4 mx-auto w-12 h-0.5 bg-primary rounded-full" />
        </div>

        {/* Logos grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5 max-w-6xl mx-auto">
          {pressLogos.map((logo) => (
            <div
              key={logo.name}
              className="group relative aspect-[3/2] flex items-center justify-center rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all duration-300 p-4"
            >
              <img
                src={logo.src}
                alt={`${logo.name} logo`}
                loading="lazy"
                width={512}
                height={512}
                className="max-h-full max-w-full object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
              />
            </div>
          ))}
        </div>

        {/* Caption */}
        <p className="text-center text-xs text-muted-foreground/70 mt-8 tracking-wider uppercase">
          Trusted & featured by leading Canadian outlets
        </p>
      </div>
    </section>
  );
};

export default AsSeenOnSection;
