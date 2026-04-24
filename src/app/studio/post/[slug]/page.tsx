import { notFound } from "next/navigation";
import { blogPosts } from "@/data/blog-posts";
import { StudioPostDetail } from "@/components/studio/StudioPostDetail";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export const metadata = {
  robots: { index: false, follow: false },
  title: "Studio — Brenda Vega Realty",
};

export default async function StudioPostPage({ params }: Props) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) notFound();
  return (
    <StudioPostDetail
      slug={post.slug}
      title={post.title}
      date={post.date}
      category={post.category}
      excerpt={post.excerpt}
      videoScript={post.videoScript}
    />
  );
}
