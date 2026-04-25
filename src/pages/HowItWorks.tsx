import Header from "@/components/Header";
import HowItWorksSection from "@/components/HowItWorksSection";
import Footer from "@/components/Footer";

const HowItWorks = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-header">
        <HowItWorksSection />
        
        {/* FAQ Section */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
              Frequently Asked Questions
            </h2>
            
            <div className="max-w-3xl mx-auto space-y-6">
              {[
                {
                  q: "What are your delivery hours?",
                  a: "We deliver from 10:00 AM to 10:00 PM, 7 days a week throughout Regina.",
                },
                {
                  q: "How much does delivery cost?",
                  a: "Delivery is free on orders over $50. For orders under $50, a small delivery fee of $4.99 applies.",
                },
                {
                  q: "Do I need to show ID?",
                  a: "Yes, all customers must be 19+ and present valid government-issued ID upon delivery. No exceptions.",
                },
                {
                  q: "What payment methods do you accept?",
                  a: "We accept cash and all major credit/debit cards. Payment is collected upon delivery.",
                },
                {
                  q: "How long does delivery take?",
                  a: "Most orders arrive within 25-45 minutes, depending on your location and store availability.",
                },
              ].map((faq, index) => (
                <div key={index} className="bg-card rounded-xl border border-border p-6">
                  <h3 className="font-display font-bold text-foreground mb-2">{faq.q}</h3>
                  <p className="text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default HowItWorks;