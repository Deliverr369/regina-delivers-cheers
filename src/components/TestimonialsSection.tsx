import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    title: "Easy to sign up and use",
    body: "Easy to sign up and use. Payment in the app. Fast and friendly service. Definitely worth it!",
    name: "Tanner Rush",
    initials: "TR",
  },
  {
    title: "Awesome experience",
    body: "Awesome experience using Deliverr — now you don't need to worry about going out to buy beer and party essentials!",
    name: "Arpit Bhakre",
    initials: "AB",
  },
  {
    title: "I love your service",
    body: "I love your website. Your service has been awesome! I really want to keep using Deliverr for a long time.",
    name: "Peter Jeffery",
    initials: "PJ",
  },
];

const TestimonialsSection = () => {
  return (
    <section className="py-16 md:py-24 bg-secondary/40">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/15 text-[hsl(var(--primary-strong))] text-xs font-semibold tracking-widest uppercase mb-4">
            Testimonials
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
            People <span className="text-[hsl(var(--primary-strong))]">love</span> us
          </h2>
          <p className="text-muted-foreground text-base">
            Real words from Regina locals who trust Deliverr to bring the good times home.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 max-w-6xl mx-auto">
          {testimonials.map((t) => (
            <article
              key={t.name}
              className="group relative bg-card border border-border rounded-2xl p-7 md:p-8 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30 transition-all duration-300"
            >
              {/* Quote icon */}
              <div className="flex items-center justify-between mb-5">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Quote className="w-4 h-4 text-[hsl(var(--primary-strong))]" fill="currentColor" />
                </div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 text-gold" fill="currentColor" />
                  ))}
                </div>
              </div>

              {/* Title */}
              <h3 className="font-display text-lg font-bold text-foreground mb-3">
                {t.title}
              </h3>

              {/* Body */}
              <p className="text-muted-foreground text-[15px] leading-relaxed mb-6">
                "{t.body}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-5 border-t border-border">
                <div className="w-10 h-10 rounded-full bg-primary-gradient flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {t.initials}
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">Verified customer</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
