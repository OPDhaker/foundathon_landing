import HeaderSection from "@/components/sections/Header";
import Hero from "@/components/sections/Hero";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeaderSection />
      <Hero />
    </div>
  );
}
