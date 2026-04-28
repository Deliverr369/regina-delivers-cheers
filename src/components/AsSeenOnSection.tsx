const pressLogos = [
  { name: "Global Regina" },
  { name: "CBC Saskatchewan" },
  { name: "Innovation Saskatchewan" },
  { name: "Morningstar" },
  { name: "Markets Insider" },
  { name: "Canadian Insider" },
];

const AsSeenOnSection = () => {
  return (
    <section className="py-20 md:py-24 bg-background border-t border-border/50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-widest uppercase mb-4">
            Press
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
            As seen on
          </h2>
          <div className="mt-4 mx-auto w-16 h-1 bg-primary rounded-full" />
        </div>

        {/* Logos grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-4 max-w-6xl mx-auto">
          {pressLogos.map((logo) => (
            <div
              key={logo.name}
              className="group relative aspect-[3/2] flex items-center justify-center rounded-xl bg-card border border-border/60 hover:border-primary/40 hover:shadow-md transition-all duration-300"
            >
              <span className="font-heading text-sm md:text-base font-bold text-muted-foreground/70 group-hover:text-primary text-center px-2 transition-colors duration-300 tracking-wide">
                {logo.name}
              </span>
            </div>
          ))}
        </div>

        {/* Caption */}
        <p className="text-center text-xs text-muted-foreground/70 mt-10 tracking-wider uppercase">
          Trusted & featured by leading Canadian outlets
        </p>
      </div>
    </section>
  );
};

export default AsSeenOnSection;
