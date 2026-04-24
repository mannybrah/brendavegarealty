"use client";

import { useEffect, useState } from "react";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      // already /embed/ form
      if (u.pathname.startsWith("/embed/")) return url;
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    return null;
  } catch {
    return null;
  }
}

interface Props {
  slug: string;
  title: string;
  staticEmbed: string; // from blog-posts.ts (may be empty)
}

export function BlogYouTubeEmbed({ slug, title, staticEmbed }: Props) {
  const [embed, setEmbed] = useState<string | null>(
    staticEmbed ? staticEmbed : null
  );

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/public/blog-state");
        if (!r.ok) return;
        const j = (await r.json()) as {
          state: Record<string, { youtubeUrl?: string }>;
        };
        const url = j.state?.[slug]?.youtubeUrl;
        if (url) {
          const e = toEmbedUrl(url);
          if (e) setEmbed(e);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [slug]);

  if (!embed) return null;

  return (
    <AnimateOnScroll>
      <div className="mt-12 mb-12">
        <h2 className="font-display font-light text-2xl text-navy mb-6">
          Watch the Video
        </h2>
        <div className="relative w-full aspect-video rounded-lg overflow-hidden">
          <iframe
            src={embed}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>
    </AnimateOnScroll>
  );
}
