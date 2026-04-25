import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="font-display text-4xl font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-10">Last updated: April 25, 2026</p>

          <div className="space-y-8">
            <section>
              <h2 className="font-display text-2xl font-bold mb-3">1. Eligibility</h2>
              <p className="text-muted-foreground leading-relaxed">
                You must be 19 years of age or older and a resident of Regina, Saskatchewan to use
                Deliverr. By using the service you confirm you meet these requirements.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">2. ID verification on delivery</h2>
              <p className="text-muted-foreground leading-relaxed">
                Valid government-issued photo ID is required at the time of delivery. Our driver
                will refuse delivery if ID cannot be produced or if the recipient appears
                intoxicated. Refused orders are non-refundable for the delivery fee.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">3. Pricing & final total</h2>
              <p className="text-muted-foreground leading-relaxed">
                In-app prices are estimates based on store data. Your card is authorized at checkout
                and the final amount is captured after the shopper confirms in-store pricing.
                Saskatchewan GST and PST apply.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">4. Cancellations & refunds</h2>
              <p className="text-muted-foreground leading-relaxed">
                Orders can be cancelled at no charge before a shopper is assigned. Once shopping has
                begun, only the delivery fee may be refundable. Damaged items will be refunded or
                replaced.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">5. Service area</h2>
              <p className="text-muted-foreground leading-relaxed">
                Deliverr currently operates only within the city of Regina, Saskatchewan.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">6. Acceptable use</h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree not to resell purchased products, supply them to minors, or use the
                service for any unlawful purpose. We may suspend accounts that violate these terms
                or applicable Saskatchewan liquor/tobacco regulations.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">7. Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                Deliverr is provided "as is". To the maximum extent permitted by law, our liability
                for any claim related to the service is limited to the value of the order in
                question.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">8. Changes</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update these terms. Continued use after an update constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-3">9. Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                Questions about these terms? Email{" "}
                <a href="mailto:support@deliverr.app" className="text-primary hover:underline">
                  support@deliverr.app
                </a>
                . See our{" "}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
