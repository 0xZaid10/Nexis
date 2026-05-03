import Hero from "@/components/sections/Hero";
import TerminalDemo from "@/components/sections/TerminalDemo";
import ProblemSection from "@/components/sections/ProblemSection";
import ComparisonTable from "@/components/sections/ComparisonTable";
import HowItWorks from "@/components/sections/HowItWorks";
import CapabilitiesGrid from "@/components/sections/CapabilitiesGrid";
import LiveStats from "@/components/sections/LiveStats";
import ProofSection from "@/components/sections/ProofSection";
import SponsorSection from "@/components/sections/SponsorSection";
import VisionSection from "@/components/sections/VisionSection";
import CTASection from "@/components/sections/CTASection";

export default function Home() {
  return (
    <>
      <Hero />
      <TerminalDemo />
      <ProblemSection />
      <ComparisonTable />
      <HowItWorks />
      <CapabilitiesGrid />
      <LiveStats />
      <ProofSection />
      <SponsorSection />
      <VisionSection />
      <CTASection />
    </>
  );
}
