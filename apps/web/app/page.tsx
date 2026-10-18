import { Features } from "@/components/landing/Features";
import { CallToAction, Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { IntegrationsMarquee } from "@/components/landing/IntegrationsMarquee";
import { Navbar } from "@/components/landing/Navbar";
import { Pricing } from "@/components/landing/Pricing";
import { UseCases } from "@/components/landing/UseCases";

export default function LandingPage() {
  return (
    <div className="overflow-x-clip">
      <Navbar />
      <main>
        <Hero />
        <IntegrationsMarquee />
        <Features />
        <UseCases />
        <Pricing />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}
