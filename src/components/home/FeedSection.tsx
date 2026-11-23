"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useHomeState } from "@/lib/useHomeState";
import { FeedPost, FEED_TYPE_LABELS, relativeTime } from "@/lib/feed";

export function FeedCard({ post, index = 0 }: { post: FeedPost; index?: number }) {
  const reduced = useReducedMotion();
  const card = (
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
  if (!post.link) return card;
  return post.link.startsWith("/") ? (
    <Link href={post.link} className="block">{card}</Link>
  ) : (
    <a href={post.link} target="_blank" rel="noopener noreferrer" className="block">{card}</a>
  );
}

export function FeedSection() {
  const { data } = useHomeState();
  const posts = data?.feedPosts ?? [];
  if (posts.length === 0) return null;
  return (
    <section className="ed ed-section">
      <div>
        <div className="ed-section-head">
          <div>
            <p className="ed-kicker">Live updates</p>
            <h2>
              Latest from <em>Brenda.</em>
            </h2>
          </div>
          <Link href="/updates" className="ed-textlink hidden tablet:inline-block whitespace-nowrap">
            See all updates &rarr;
          </Link>
        </div>

        {/* Mobile: swipeable strip. Desktop: grid of up to 6. */}
        <div className="flex desktop:grid desktop:grid-cols-3 gap-5 overflow-x-auto desktop:overflow-visible snap-x snap-mandatory pb-2">
          {posts.slice(0, 6).map((post, i) => (
            <div key={post.id} className="w-[280px] desktop:w-auto shrink-0 desktop:shrink snap-start">
              <FeedCard post={post} index={i} />
            </div>
          ))}
        </div>

        <div className="mt-8 text-center tablet:hidden">
          <Link
            href="/updates"
            className="ed-textlink"
          >
            See all updates &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
