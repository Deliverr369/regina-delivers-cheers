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
    <section className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-b from-background via-muted/30 to-background">
      {/* Decorative background blobs */}
      <div className="absolute top-0 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" aria-hidden />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" aria-hidden />

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 md:mb-20">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-widest uppercase mb-4">
            Testimonials
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-4">
            People <span className="text-primary">love</span> us
          </h2>
          <p className="text-muted-foreground text-base md:text-lg">
            Real words from Regina locals who trust Deliverr to bring the good times home.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {testimonials.map((t, i) => (
            <article
              key={t.name}
              className="group relative bg-card border border-border/60 rounded-2xl p-7 md:p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {/* Top accent bar */}
              <div className="absolute top-0 left-7 right-7 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />

              {/* Quote icon */}
              <div className="flex items-center justify-between mb-5">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Quote className="w-5 h-5 text-primary" fill="currentColor" />
                </div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 text-primary" fill="currentColor" />
                  ))}
                </div>
              </div>

              {/* Title */}
              <h3 className="font-heading text-lg md:text-xl font-bold text-foreground mb-3">
                {t.title}
              </h3>

              {/* Body */}
              <p className="text-muted-foreground text-[15px] leading-relaxed mb-6">
                "{t.body}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-5 border-t border-border/50">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-sm">
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
