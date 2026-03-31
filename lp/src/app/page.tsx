import { Nav } from "./_components/Nav";
import { Hero } from "./_components/Hero";
import { PainSection } from "./_components/PainSection";
import { FeatureSection } from "./_components/FeatureSection";
import { TargetSection } from "./_components/TargetSection";
import { CtaSection } from "./_components/CtaSection";
import { Footer } from "./_components/Footer";

export default function LandingPage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <PainSection />
        <FeatureSection />
        <TargetSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
