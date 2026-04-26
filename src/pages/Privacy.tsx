import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEO } from "@/components/seo/SEO";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Privacy Policy | Deliverr Regina"
        description="How Deliverr collects, uses, and protects your personal information when you order liquor and tobacco delivery in Regina."
        canonical="https://regina-delivers-cheers.lovable.app/privacy"
      />
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="font-display text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-10">Last updated: April 25, 2026</p>

          <div className="prose prose-neutral max-w-none space-y-8 text-foreground">
            <section>
              <h2 className="font-display text-2xl font-bold mb-3">1. Who we are</h2>
              <p className="text-muted-foreground leading-relaxed">
                Deliverr ("we", "us", "our") operates a liquor and tobacco delivery service in
                Regina, Saskatchewan. This policy explains what personal information we collect,
                how we use it, and your rights.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">2. Information we collect</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
                <li><strong>Account info:</strong> name, email, phone, password hash.</li>
                <li><strong>Delivery info:</strong> address, postal code, delivery instructions.</li>
                <li><strong>Order history:</strong> products purchased, totals, timestamps.</li>
                <li><strong>Payment info:</strong> processed securely by Stripe — we never see or store your card number.</li>
                <li><strong>Device info:</strong> app version, OS, crash logs and basic usage analytics.</li>
                <li><strong>Age verification:</strong> a record that you confirmed you are 19+.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">3. How we use it</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
                <li>To process and deliver your orders.</li>
                <li>To send order, delivery and account notifications.</li>
                <li>To verify legal age and identity at delivery.</li>
                <li>To prevent fraud and comply with Saskatchewan liquor and tobacco laws.</li>
                <li>To improve the app and our service.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">4. Sharing</h2>
              <p className="text-muted-foreground leading-relaxed">
                We share order details only with the partner store and the delivery shopper assigned
                to your order. Payment data goes to Stripe. We do not sell your personal information.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">5. Push notifications</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you enable push notifications, we use them to send order updates (placed,
                shopping, out for delivery, delivered). You can disable them anytime in your device
                settings.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">6. Your rights</h2>
              <p className="text-muted-foreground leading-relaxed">
                You may request access, correction or deletion of your personal information at any
                time by emailing{" "}
                <a href="mailto:privacy@deliverr.app" className="text-primary hover:underline">
                  privacy@deliverr.app
                </a>
                . We will respond within 30 days.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">7. Data retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                Orders and tax records are kept for 7 years as required by Canadian tax law. You may
                close your account at any time; identifying details are removed within 30 days.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">8. Children</h2>
              <p className="text-muted-foreground leading-relaxed">
                Deliverr is strictly for adults of legal age (19+ in Saskatchewan). We do not
                knowingly collect data from anyone under 19.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">9. Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                Questions? Reach us at{" "}
                <a href="mailto:privacy@deliverr.app" className="text-primary hover:underline">
                  privacy@deliverr.app
                </a>
                . See also our{" "}
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
