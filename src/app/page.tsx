import { Hero } from "@/components/home/Hero";
import { MeetBrenda } from "@/components/home/MeetBrenda";
import { FeaturedProperty } from "@/components/home/FeaturedProperty";
import { AreasPreview } from "@/components/home/AreasPreview";
import { HomeClaritySection } from "@/components/home/HomeClaritySection";
import { FeedSection } from "@/components/home/FeedSection";
import { FinalCTA } from "@/components/home/FinalCTA";

export default function HomePage() {
  return (
    <>
      {/* Only the hero image is preloaded; everything below it lazy-loads */}
      <link
        rel="preload"
        as="image"
        href="/images/home/hero.jpg"
        imageSrcSet="/images/home/hero-sm.jpg 900w, /images/home/hero.jpg 1600w"
        imageSizes="100vw"
        fetchPriority="high"
      />
      <Hero />
      <MeetBrenda />
      <FeaturedProperty />
      <AreasPreview />
      <HomeClaritySection />
      {/* Brenda's live studio updates; renders nothing when she has no posts */}
      <FeedSection />
      <FinalCTA />
    </>
  );
}
