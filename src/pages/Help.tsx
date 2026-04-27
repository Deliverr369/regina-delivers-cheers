import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEO } from "@/components/seo/SEO";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { LifeBuoy, Mail, Phone, MessageCircle, Sparkles } from "lucide-react";

type QA = { q: string; a: string };
type Section = { id: string; title: string; emoji: string; items: QA[] };

const sections: Section[] = [
  {
    id: "general",
    title: "General",
    emoji: "💡",
    items: [
      { q: "What is Deliverr?", a: "Deliverr is Regina's on-demand liquor and smokes delivery service. We bring beer, wine, spirits, ciders, seltzers and smokes from your favourite local stores straight to your door — usually in under 60 minutes." },
      { q: "What stores can I order from?", a: "You can order from leading Regina liquor retailers including Sobeys Liquor, Co-op Liquor, Costco Liquor, Superstore Liquor and more. Browse the Stores page to see everything available." },
      { q: "What areas do you deliver to?", a: "We currently deliver throughout Regina, Saskatchewan only. Our checkout validates every address to make sure it's inside our service zone." },
    ],
  },
  {
    id: "about",
    title: "About Deliverr",
    emoji: "🚀",
    items: [
      { q: "How fast do you deliver?", a: "Most Regina orders arrive in 25–60 minutes. You can also schedule a delivery for later in the day." },
      { q: "What are your delivery hours?", a: "We deliver from 10:00 AM to 10:00 PM, 7 days a week, subject to each store's operating hours." },
      { q: "How is pricing calculated?", a: "You pay store prices on products plus a small delivery fee that depends on the store. Saskatchewan GST/PST and any applicable bottle deposits are calculated at checkout." },
    ],
  },
  {
    id: "payment",
    title: "Payment",
    emoji: "💳",
    items: [
      { q: "What payment methods do you accept?", a: "We accept Visa, Mastercard and American Express credit and debit cards. We do not accept cash on delivery." },
      { q: "Why do I see a hold on my card?", a: "When you place an order we authorize an estimated amount on your card. Once your order is finalized we capture the actual total — the temporary hold is released by your bank." },
      { q: "I think I have an unauthorized charge", a: "Please contact us right away at support@deliverr.ca or call 306-533-3333 and our team will investigate immediately." },
      { q: "My refund or credit looks incorrect", a: "Reach out via email, live chat or phone and we'll review your order and make it right." },
    ],
  },
  {
    id: "account",
    title: "My Account",
    emoji: "👤",
    items: [
      { q: "How do I create an account?", a: "Tap Sign Up from the top of the site or app, enter your email and a password, or continue with Google. It takes less than a minute." },
      { q: "How do I reset my password?", a: "On the login page, tap 'Forgot Password', enter your email and check your inbox for a reset link." },
      { q: "How do I update my delivery address?", a: "Open Profile → Saved Addresses to add, edit or remove delivery addresses. All addresses are validated to ensure they are inside Regina." },
      { q: "How do I manage notifications?", a: "Open Profile → Notifications to choose between push notifications and SMS for order updates." },
      { q: "How do I add or remove a credit card?", a: "Open Profile → Payment Methods to securely add a card or remove one you no longer use." },
    ],
  },
  {
    id: "inventory",
    title: "Inventory & Prices",
    emoji: "🏷️",
    items: [
      { q: "What happens if something is out of stock?", a: "If an item is unavailable, your shopper will message you with the closest substitute or you can choose to refund that item." },
      { q: "Are your prices the same as in-store?", a: "Yes — we charge store prices on products. A small delivery fee and applicable taxes are added at checkout." },
      { q: "Do you honour in-store sales or coupons?", a: "In-store promotions are not always guaranteed. Watch the home page for Deliverr-exclusive deals and promo codes." },
    ],
  },
  {
    id: "orders",
    title: "About My Order",
    emoji: "📦",
    items: [
      { q: "Where is my order?", a: "After checkout you'll receive a confirmation and live tracking link. You can also view current and past orders from the Orders page." },
      { q: "How do I make a change to my order?", a: "If shopping hasn't started yet, contact our support team via chat, email or phone and we'll do our best to update your order." },
      { q: "What is your cancellation policy?", a: "You can cancel for a full refund up until your shopper begins picking your order. After that a $10 cancellation fee may apply." },
      { q: "How do I report a problem?", a: "Call 306-533-3333, email support@deliverr.ca or use live chat. Our team responds quickly to make things right." },
      { q: "When will I receive my refund?", a: "Refunds typically post within 3–5 business days. Some banks adjust the original authorization instead of showing a separate credit." },
      { q: "Do I need to show ID?", a: "Yes. All Regina alcohol and smokes deliveries require valid government-issued photo ID proving you are 19 or older. No exceptions." },
    ],
  },
  {
    id: "shoppers",
    title: "Deliverr Shoppers",
    emoji: "🛍️",
    items: [
      { q: "Who delivers my order?", a: "Your order is hand-picked and delivered by a screened, professionally trained Deliverr Shopper." },
      { q: "Should I tip my shopper?", a: "Tips are appreciated but never required. 100% of tips go directly to your shopper." },
      { q: "How do I add a tip?", a: "You can add a tip to your card at checkout, after delivery in the app, or hand cash directly to your shopper." },
    ],
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: sections.flatMap((s) =>
    s.items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  ),
};

const Help = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Help Center — Deliverr Liquor Delivery Regina"
        description="Get answers about Regina liquor delivery: orders, payments, ID checks, refunds, accounts and more. Contact Deliverr support 7 days a week."
        canonical="https://regina-delivers-cheers.lovable.app/help"
        jsonLd={faqJsonLd}
      />
      <Header />
      <main className="pt-header">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 py-16 md:py-24">
          <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-secondary/20 blur-3xl" />
          <div className="relative container mx-auto px-4 text-center max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-5">
              <LifeBuoy className="h-3.5 w-3.5" /> Help Center
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-extrabold text-foreground leading-tight mb-4">
              Need help? <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">We've got you</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Answers to the most common questions about Regina liquor delivery, payments, accounts and orders.
            </p>
          </div>
        </section>

        {/* Quick links */}
        <section className="py-6 bg-background border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-2">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="px-4 py-2 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground text-sm font-medium text-foreground transition-colors"
                >
                  {s.emoji} {s.title}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4 max-w-3xl space-y-12">
            {sections.map((s) => (
              <div key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-5 flex items-center gap-3">
                  <span className="text-3xl">{s.emoji}</span> {s.title}
                </h2>
                <Accordion type="single" collapsible className="bg-card rounded-2xl border border-border px-4">
                  {s.items.map((it, idx) => (
                    <AccordionItem key={idx} value={`${s.id}-${idx}`} className="border-border last:border-0">
                      <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                        {it.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed">
                        {it.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="py-16 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
                <Sparkles className="h-3.5 w-3.5" /> Still need help?
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">Contact our team</h2>
              <p className="text-muted-foreground">We're here 7 days a week to help with your Regina order.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <a href="tel:+13065333333" className="bg-card rounded-2xl border border-border p-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all">
                <Phone className="h-6 w-6 text-primary mx-auto mb-3" />
                <h3 className="font-display font-bold text-foreground mb-1">Call us</h3>
                <p className="text-sm text-muted-foreground">306-533-3333</p>
              </a>
              <a href="mailto:support@deliverr.ca" className="bg-card rounded-2xl border border-border p-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all">
                <Mail className="h-6 w-6 text-primary mx-auto mb-3" />
                <h3 className="font-display font-bold text-foreground mb-1">Email</h3>
                <p className="text-sm text-muted-foreground">support@deliverr.ca</p>
              </a>
              <Link to="/orders" className="bg-card rounded-2xl border border-border p-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all">
                <MessageCircle className="h-6 w-6 text-primary mx-auto mb-3" />
                <h3 className="font-display font-bold text-foreground mb-1">Live chat</h3>
                <p className="text-sm text-muted-foreground">From your order page</p>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Help;
