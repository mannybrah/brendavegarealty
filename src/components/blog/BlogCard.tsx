"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { BlogPost } from "@/data/blog-posts";

interface BlogCardProps {
  post: BlogPost;
}

export function BlogCard({ post }: BlogCardProps) {
  const formattedDate = new Date(post.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Link href={`/blog/${post.slug}`} className="block group">
      <motion.article
        className="bg-cream rounded-lg p-8 h-full flex flex-col transition-shadow duration-300 group-hover:shadow-xl group-hover:shadow-navy/8"
        whileHover={{ y: -4 }}
        transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
      >
        <span className="font-body font-medium text-[0.65rem] tracking-[0.3em] uppercase text-gold">
          {post.category}
        </span>

        <h3 className="font-display font-light text-[clamp(1.3rem,2vw,1.6rem)] text-navy mt-3 mb-3 leading-snug group-hover:text-teal transition-colors duration-300">
          {post.title}
        </h3>

        <p className="font-body font-light text-[0.95rem] text-charcoal-light leading-relaxed mb-6 flex-1">
          {post.excerpt}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-navy/8">
          <span className="font-body text-[0.8rem] text-charcoal-light">
            {formattedDate}
          </span>
          <span className="font-body text-[0.8rem] text-charcoal-light">
            {post.readTime}
          </span>
        </div>

        <span className="inline-flex items-center gap-2 font-body font-medium text-[0.8rem] tracking-[0.08em] uppercase text-teal mt-4 group-hover:gap-3 transition-all duration-300">
          Read More
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </span>
      </motion.article>
    </Link>
  );
}
