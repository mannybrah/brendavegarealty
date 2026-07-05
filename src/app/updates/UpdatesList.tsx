"use client";

import { useHomeState } from "@/lib/useHomeState";
import { FeedCard } from "@/components/home/FeedSection";

export function UpdatesList() {
  const { data, loading } = useHomeState();
  const posts = data?.feedPosts ?? [];
  if (loading) {
    return <div className="font-body text-sm text-charcoal-light">Loading…</div>;
  }
  if (posts.length === 0) {
    return <div className="font-body text-sm text-charcoal-light">Nothing here yet — check back soon.</div>;
  }
  return (
    <div className="grid tablet:grid-cols-2 gap-6">
      {posts.map((post, i) => (
        <FeedCard key={post.id} post={post} index={i % 2} />
      ))}
    </div>
  );
}
