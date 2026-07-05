"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useHomeState } from "@/lib/useHomeState";
import { FeedPost, FEED_TYPE_LABELS, relativeTime } from "@/lib/feed";

export function FeedCard({ post, index = 0 }: { post: FeedPost; index?: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.article
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.2, 0, 0, 1] }}
      className="bg-white rounded-md overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all"
    >
      {post.imageKeys[0] && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element -- runtime R2 image, not optimizable at build */}
          <img
            src={`/media/${post.imageKeys[0]}`}
            alt={post.caption || FEED_TYPE_LABELS[post.type]}
            className="w-full h-56 object-cover"
            loading="lazy"
          />
          <span className="absolute top-4 left-4 bg-gold text-navy font-ui font-medium text-xs tracking-wider px-3 py-1 rounded-full">
            {FEED_TYPE_LABELS[post.type]}
          </span>
        </div>
      )}
      <div className="p-5">
        {!post.imageKeys[0] && (
          <span className="inline-block bg-gold/15 text-gold font-ui font-medium text-xs tracking-wider px-3 py-1 rounded-full mb-3">
            {FEED_TYPE_LABELS[post.type]}
          </span>
        )}
        {post.caption && (
          <p className="font-body font-light text-sm text-charcoal leading-relaxed line-clamp-4 whitespace-pre-line">
            {post.caption}
          </p>
        )}
        <div className="mt-3 font-ui text-[0.65rem] tracking-wider uppercase text-charcoal-light">
          {relativeTime(post.createdAt)}
        </div>
      </div>
    </motion.article>
  );
}

export function FeedSection() {
  const { data } = useHomeState();
  const posts = data?.feedPosts ?? [];
  if (posts.length === 0) return null;
  return (
    <section className="py-20 px-6 bg-navy">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-end justify-between mb-12 gap-4">
          <div>
            <SectionLabel>Live Updates</SectionLabel>
            <h2 className="font-display font-light text-[clamp(2rem,4vw,3.2rem)] text-cream mt-4 leading-tight">
              Latest from <em className="text-gold italic">Brenda</em>
            </h2>
          </div>
          <Link
            href="/updates"
            className="hidden tablet:block font-ui font-medium text-xs tracking-wider uppercase text-cream/70 hover:text-gold transition-colors whitespace-nowrap"
          >
            See All Updates &rarr;
          </Link>
        </div>

        {/* Mobile: swipeable strip. Desktop: grid of up to 6. */}
        <div className="flex desktop:grid desktop:grid-cols-3 gap-5 overflow-x-auto desktop:overflow-visible snap-x snap-mandatory -mx-6 px-6 desktop:mx-0 desktop:px-0 pb-2">
          {posts.slice(0, 6).map((post, i) => (
            <div key={post.id} className="w-[280px] desktop:w-auto shrink-0 desktop:shrink snap-start">
              <FeedCard post={post} index={i} />
            </div>
          ))}
        </div>

        <div className="mt-8 text-center tablet:hidden">
          <Link
            href="/updates"
            className="font-ui font-medium text-xs tracking-wider uppercase text-cream/70 hover:text-gold transition-colors"
          >
            See All Updates &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
