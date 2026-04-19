import { Hero } from "@/components/hero/Hero";
import { TerminalStats } from "@/components/stats/TerminalStats";
import { About } from "@/components/about/About";
import { ExpertiseCards } from "@/components/expertise/ExpertiseCards";
import { Products } from "@/components/products/Products";
import { SkillsMesh } from "@/components/skills/SkillsMesh";
import { Timeline } from "@/components/experience/Timeline";
import { Contact } from "@/components/contact/Contact";
import { Footer } from "@/components/footer/Footer";
import { SidebarNav } from "@/components/nav/SidebarNav";

export default function Home() {
  return (
    <main className="relative">
      <SidebarNav />
      <Hero />
      <TerminalStats />
      <About />
      <ExpertiseCards />
      <Products />
      <SkillsMesh />
      <Timeline />
      <Contact />
      <Footer />
    </main>
  );
}
