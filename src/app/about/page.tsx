import type { Metadata } from "next";
import { BioSection } from "@/components/about/BioSection";
import { Credentials } from "@/components/about/Credentials";
import { PhotoGallery } from "@/components/about/PhotoGallery";
import { FinalCTA } from "@/components/home/FinalCTA";

export const metadata: Metadata = {
  title: "About Brenda Vega",
  description:
    "Meet Brenda Vega — a dedicated Bay Area real estate professional with Century 21, serving Campbell and beyond with integrity and heart.",
};

export default function AboutPage() {
  return (
    <>
      <BioSection />
      <Credentials />
      <PhotoGallery />
      <FinalCTA />
    </>
  );
}
