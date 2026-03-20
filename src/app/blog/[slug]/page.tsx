import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { BlogCard } from "@/components/blog/BlogCard";
import { blogPosts } from "@/data/blog-posts";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: `${post.title} | Brenda Vega Realty`,
    description: post.metaDescription,
    keywords: post.keywords,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  const relatedPosts = blogPosts
    .filter((p) => p.category === post.category && p.slug !== post.slug)
    .slice(0, 2);

  const formattedDate = new Date(post.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.date,
    author: {
      "@type": "Person",
      name: "Brenda Vega",
    },
    publisher: {
      "@type": "Organization",
      name: "Brenda Vega Realty",
      url: "https://brendavegarealty.com",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="py-20 px-6">
        <div className="max-w-[800px] mx-auto">
          {/* Back Link */}
          <AnimateOnScroll>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 font-body text-[0.85rem] text-charcoal-light hover:text-teal transition-colors mb-10"
            >
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
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to Blog
            </Link>
          </AnimateOnScroll>

          {/* Post Header */}
          <AnimateOnScroll>
            <header className="mb-12">
              <SectionLabel>{post.category}</SectionLabel>
              <h1 className="font-display font-light text-[clamp(2rem,4.5vw,3.2rem)] text-navy mt-4 mb-6 leading-tight">
                {post.title}
              </h1>
              <div className="flex items-center gap-4 font-body text-[0.85rem] text-charcoal-light">
                <span>{formattedDate}</span>
                <span className="w-1 h-1 bg-charcoal-light/40 rounded-full" />
                <span>{post.readTime}</span>
              </div>
            </header>
          </AnimateOnScroll>

          {/* Post Content */}
          <AnimateOnScroll>
            <div
              className="blog-content font-body font-light text-[1.05rem] text-charcoal leading-[1.85] [&_h2]:font-display [&_h2]:font-light [&_h2]:text-[clamp(1.5rem,3vw,2rem)] [&_h2]:text-navy [&_h2]:mt-12 [&_h2]:mb-5 [&_h2]:leading-tight [&_h3]:font-display [&_h3]:font-light [&_h3]:text-[clamp(1.2rem,2.5vw,1.5rem)] [&_h3]:text-navy [&_h3]:mt-8 [&_h3]:mb-4 [&_h3]:leading-snug [&_p]:mb-5 [&_ul]:mb-5 [&_ul]:pl-6 [&_ul]:space-y-2 [&_li]:list-disc [&_li]:text-charcoal [&_strong]:font-medium [&_strong]:text-navy"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </AnimateOnScroll>

          {/* YouTube Embed */}
          {post.youtubeEmbed && (
            <AnimateOnScroll>
              <div className="mt-12 mb-12">
                <h2 className="font-display font-light text-2xl text-navy mb-6">
                  Watch the Video
                </h2>
                <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                  <iframe
                    src={post.youtubeEmbed}
                    title={post.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
              </div>
            </AnimateOnScroll>
          )}

          {/* Author Box */}
          <AnimateOnScroll>
            <div className="mt-16 p-8 bg-cream rounded-lg">
              <h3 className="font-display font-light text-xl text-navy mb-3">
                About Brenda Vega
              </h3>
              <p className="font-body font-light text-[0.95rem] text-charcoal-light leading-relaxed mb-4">
                Brenda Vega is a dedicated South Bay real estate agent
                specializing in Campbell, San Jose, Los Gatos, and Saratoga. With
                deep local knowledge and a client-first approach, she helps buyers
                and sellers navigate the Silicon Valley market with confidence.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 font-body font-medium text-[0.85rem] tracking-[0.08em] uppercase text-teal hover:text-navy transition-colors"
              >
                Get in Touch
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
              </Link>
            </div>
          </AnimateOnScroll>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-16 px-6 bg-warm-white">
          <div className="max-w-[1200px] mx-auto">
            <AnimateOnScroll>
              <div className="text-center mb-10">
                <SectionLabel>Keep Reading</SectionLabel>
                <h2 className="font-display font-light text-[clamp(1.5rem,3vw,2.2rem)] text-navy mt-4">
                  Related Articles
                </h2>
              </div>
            </AnimateOnScroll>
            <div className="grid tablet:grid-cols-2 gap-6 max-w-[800px] mx-auto">
              {relatedPosts.map((relPost, i) => (
                <AnimateOnScroll key={relPost.slug} delay={i * 0.1}>
                  <BlogCard post={relPost} />
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
