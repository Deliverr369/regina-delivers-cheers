import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEO } from "@/components/seo/SEO";
import { ShieldCheck } from "lucide-react";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Privacy Policy — Deliverr Regina Liquor Delivery"
        description="How Deliverr collects, uses, shares and protects your personal information when ordering liquor and smokes delivery in Regina, Saskatchewan. PIPEDA compliant."
        canonical="https://regina-delivers-cheers.lovable.app/privacy"
      />
      <Header />
      <main className="pt-header pb-20">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 py-14 md:py-20">
          <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-secondary/15 blur-3xl" />
          <div className="relative container mx-auto px-4 max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
              <ShieldCheck className="h-3.5 w-3.5" /> Your Privacy Matters
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-extrabold text-foreground mb-3">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground">Last updated: April 27, 2026</p>
          </div>
        </section>

        <div className="container mx-auto px-4 max-w-3xl mt-10">
          <div className="prose prose-neutral max-w-none space-y-8 text-foreground">
            <section>
              <p className="text-muted-foreground leading-relaxed">
                Deliverr ("Deliverr", "we", "us", or "our") operates an alcohol, tobacco and
                lifestyle delivery service in Regina, Saskatchewan, available through our website
                and mobile applications (collectively, the "Service"). This Privacy Policy explains
                what personal information we collect, how we use and share it, and the choices you
                have. We comply with Canada's Personal Information Protection and Electronic
                Documents Act (PIPEDA) and applicable provincial privacy laws.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-3">
                By using the Service you agree to the collection and use of information as
                described below.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">1. Information we collect</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
                <li><strong>Account information:</strong> name, email, phone number, password (hashed).</li>
                <li><strong>Delivery information:</strong> address, postal code, unit number, delivery instructions.</li>
                <li><strong>Order history:</strong> products purchased, totals, store, timestamps and order status.</li>
                <li><strong>Payment information:</strong> processed securely by Stripe — we never store full card numbers on our servers.</li>
                <li><strong>Identity & age verification:</strong> a record that you confirmed you are 19+; your shopper visually verifies a government-issued ID at delivery.</li>
                <li><strong>Device & log data:</strong> IP address, browser/OS type, app version, crash reports, pages viewed and timestamps.</li>
                <li><strong>Location data:</strong> approximate location used for delivery zone validation and live shopper tracking (only when you grant permission).</li>
                <li><strong>Communications:</strong> messages with our support team, ratings and feedback you provide.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">2. How we use your information</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
                <li>To process, fulfill and deliver your orders.</li>
                <li>To send transactional updates (order placed, shopping, out for delivery, delivered).</li>
                <li>To verify legal age and identity at the door.</li>
                <li>To prevent fraud, abuse, and unauthorized access.</li>
                <li>To comply with Saskatchewan liquor and tobacco regulations and Canadian tax law.</li>
                <li>To improve the Service through analytics and aggregated insights.</li>
                <li>With your consent, to send promotional offers (you can unsubscribe at any time).</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">3. How we share information</h2>
              <p className="text-muted-foreground leading-relaxed mb-2">
                We share personal information only as needed to operate the Service:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
                <li><strong>Partner stores</strong> — your order details so the products can be picked.</li>
                <li><strong>Delivery shoppers</strong> — your name, address, phone and order to complete delivery.</li>
                <li><strong>Payment processor (Stripe)</strong> — payment details processed under Stripe's privacy policy.</li>
                <li><strong>Service providers</strong> — hosting, mapping, analytics and customer-support tools bound by confidentiality agreements.</li>
                <li><strong>Legal authorities</strong> — when required by law, court order, or to protect rights, safety and property.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                <strong>We do not sell your personal information.</strong>
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">4. Cookies & tracking</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use cookies and similar technologies to keep you signed in, remember your cart,
                measure performance and improve the Service. You can disable cookies in your browser
                settings, but some features may not work properly without them.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">5. Push notifications</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you enable push notifications, we use them to send order status updates and
                occasional promotions. You can disable them at any time from your device settings or
                in-app preferences.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">6. Data security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use industry-standard safeguards including encryption in transit (HTTPS/TLS),
                encrypted databases, hashed passwords, role-based access controls and regular
                security reviews. No system is 100% secure, but we work hard to protect your data.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">7. Data retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain order, invoice and tax records for 7 years as required by Canadian tax
                law. You may close your account at any time; identifying details are removed or
                anonymized within 30 days, except where retention is legally required.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">8. Your rights</h2>
              <p className="text-muted-foreground leading-relaxed mb-2">
                Under PIPEDA you have the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
                <li>Access the personal information we hold about you.</li>
                <li>Request corrections to inaccurate information.</li>
                <li>Request deletion of your account and personal data.</li>
                <li>Withdraw consent for marketing communications at any time.</li>
                <li>File a complaint with the Office of the Privacy Commissioner of Canada.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                To exercise any of these rights, email{" "}
                <a href="mailto:privacy@deliverr.app" className="text-primary hover:underline">
                  privacy@deliverr.app
                </a>
                . We will respond within 30 days.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">9. International data transfers</h2>
              <p className="text-muted-foreground leading-relaxed">
                Some of our service providers (such as cloud hosting and payment processing) may
                store data outside Canada. When we transfer information internationally, we ensure
                comparable safeguards are in place.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">10. Children</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service is strictly for adults of legal age (19+ in Saskatchewan). We do not
                knowingly collect personal information from anyone under 19. If you believe a minor
                has provided us with personal information, please contact us and we will delete it
                immediately.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">11. Changes to this policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. Material changes will be posted
                on this page with an updated "Last updated" date. Continued use of the Service after
                changes take effect constitutes acceptance of the revised policy.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">12. Contact us</h2>
              <p className="text-muted-foreground leading-relaxed">
                Questions or concerns? Reach our Privacy Officer at{" "}
                <a href="mailto:privacy@deliverr.app" className="text-primary hover:underline">
                  privacy@deliverr.app
                </a>{" "}
                or call <a href="tel:+13065333333" className="text-primary hover:underline">306-533-3333</a>. See also our{" "}
                <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
