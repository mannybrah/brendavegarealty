"use client";

import { useState } from "react";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { BlogCard } from "@/components/blog/BlogCard";
import { blogPosts } from "@/data/blog-posts";

const categories = ["All", "Buying", "Selling", "Neighborhoods", "Market Update"];

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredPosts =
    activeCategory === "All"
      ? blogPosts
      : blogPosts.filter((post) => post.category === activeCategory);

  return (
    <>
      <section className="py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <AnimateOnScroll>
            <div className="text-center mb-16">
              <SectionLabel>Real Estate Insights</SectionLabel>
              <h1 className="font-display font-light text-[clamp(2rem,4vw,3.2rem)] text-navy mt-4 leading-tight">
                South Bay Real Estate <em className="text-teal">Blog</em>
              </h1>
              <p className="font-body font-light text-lg text-charcoal-light mt-4 max-w-[600px] mx-auto leading-relaxed">
                Tips, market updates, and neighborhood guides to help you make
                confident real estate decisions in the South Bay.
              </p>
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll>
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`font-ui font-medium text-[0.78rem] tracking-wider uppercase px-6 py-3 rounded-md cursor-pointer transition-all duration-300 ${
                    activeCategory === category
                      ? "bg-navy text-cream"
                      : "bg-cream text-charcoal-light hover:bg-navy/5 hover:text-navy"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </AnimateOnScroll>

          <div className="grid tablet:grid-cols-2 gap-6">
            {filteredPosts.map((post, i) => (
              <AnimateOnScroll key={post.slug} delay={i * 0.08}>
                <BlogCard post={post} />
              </AnimateOnScroll>
            ))}
          </div>

          {filteredPosts.length === 0 && (
            <div className="text-center py-16">
              <p className="font-body text-charcoal-light text-lg">
                No posts found in this category yet. Check back soon!
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
