import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { siteConfig } from "@/data/site";
import { areas } from "@/data/areas";
import { services, getService, DRE_LOOKUP_URL } from "@/data/services";
import { getVisiblePosts } from "@/lib/visiblePosts";

// Answer-first service page (src/data/services.ts): a direct answer up top, what
// working with Brenda involves, FAQs mirrored into FAQPage JSON-LD so search engines
// and AI assistants can quote them, then area / article links and a contact CTA.

const SITE_URL = `https://${siteConfig.domain}`;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return {};
  return {
    title: service.metaTitle,
    description: service.metaDescription,
  };
}

function jsonLd(data: object) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const { agent } = siteConfig;
  const url = `${SITE_URL}/services/${service.slug}`;
  const visiblePosts = getVisiblePosts();
  const posts = service.posts
    .map((postSlug) => visiblePosts.find((p) => p.slug === postSlug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const otherServices = services.filter((s) => s.slug !== service.slug);

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    serviceType: service.title,
    description: service.metaDescription,
    url,
    provider: {
      "@type": "RealEstateAgent",
      name: siteConfig.name,
      url: SITE_URL,
      telephone: agent.phone,
      email: agent.email,
      employee: {
        "@type": "Person",
        name: agent.name,
        jobTitle: agent.title,
        identifier: `California DRE #${agent.dre}`,
      },
      memberOf: { "@type": "Organization", name: agent.brokerage },
    },
    areaServed: areas.map((a) => ({ "@type": "City", name: `${a.name}, CA` })),
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: service.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Services", item: `${SITE_URL}/services` },
      { "@type": "ListItem", position: 3, name: service.title, item: url },
    ],
  };

  const overline = "font-body font-medium text-xs tracking-[0.2em] uppercase text-gold";

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(serviceLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbLd)} />

      {/* Direct answer */}
      <section className="py-20 px-6 bg-cream">
        <div className="max-w-[1200px] mx-auto">
          <AnimateOnScroll>
            <SectionLabel>
              <Link href="/services" className="hover:text-navy transition-colors">Services</Link>
              {" "}&middot; {service.title}
            </SectionLabel>
            <h1 className="font-display font-light text-[clamp(2.2rem,4.5vw,3.6rem)] text-navy mt-4 mb-6 leading-tight max-w-[800px]">
              {service.headline}
            </h1>
            <p className="font-body font-light text-lg text-charcoal-light max-w-[760px] leading-relaxed">
              {service.answer}
            </p>
            <p className="mt-5 font-body font-medium text-[0.65rem] tracking-[0.3em] uppercase text-charcoal-light/80">
              {agent.name}, {agent.title} &middot; {agent.brokerage} &middot; DRE #{agent.dre}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link href="/contact#schedule">
                <Button variant="primary">Book a Free Consultation</Button>
              </Link>
              <a
                href={`tel:${agent.phoneRaw}`}
                className="font-ui font-medium text-[0.78rem] tracking-wider uppercase text-navy hover:text-teal transition-colors"
              >
                Call {agent.phone}
              </a>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* What working with Brenda involves + verifiable facts */}
      <section className="py-16 px-6">
        <div className="max-w-[1200px] mx-auto grid desktop:grid-cols-[3fr_2fr] gap-16">
          <AnimateOnScroll>
            <h2 className="font-display font-light text-2xl text-navy mb-6">What working with Brenda involves</h2>
            <ul className="space-y-4 list-none p-0">
              {service.involves.map((item) => (
                <li key={item} className="font-body font-light text-base text-charcoal flex items-start gap-3">
                  <span className="w-2 h-2 mt-2 rounded-full bg-teal flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </AnimateOnScroll>
          <AnimateOnScroll delay={0.2}>
            <div className="bg-cream rounded-xl p-6">
              <h2 className={`${overline} mb-5`}>License &amp; contact</h2>
              <dl className="space-y-3 font-body font-light text-[0.95rem] text-charcoal">
                <div>
                  <dt className="text-charcoal-light text-sm">Agent</dt>
                  <dd>{agent.name}, {agent.title}</dd>
                </div>
                <div>
                  <dt className="text-charcoal-light text-sm">Brokerage</dt>
                  <dd>{agent.brokerage}</dd>
                </div>
                <div>
                  <dt className="text-charcoal-light text-sm">California DRE license</dt>
                  <dd>
                    #{agent.dre}{" "}
                    <a href={DRE_LOOKUP_URL} target="_blank" rel="noopener noreferrer" className="text-teal underline hover:text-navy transition-colors">
                      Verify on the DRE website
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-charcoal-light text-sm">Primary area</dt>
                  <dd>Campbell, CA</dd>
                </div>
                <div>
                  <dt className="text-charcoal-light text-sm">Phone</dt>
                  <dd><a href={`tel:${agent.phoneRaw}`} className="hover:text-teal transition-colors">{agent.phone}</a></dd>
                </div>
                <div>
                  <dt className="text-charcoal-light text-sm">Email</dt>
                  <dd><a href={`mailto:${agent.email}`} className="hover:text-teal transition-colors break-all">{agent.email}</a></dd>
                </div>
              </dl>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* How it works */}
      <section className="pb-16 px-6">
        <div className="max-w-[1200px] mx-auto grid desktop:grid-cols-3 gap-12">
          {service.sections.map((s, i) => (
            <AnimateOnScroll key={s.heading} delay={i * 0.1}>
              <h2 className="font-display font-light text-2xl text-navy mb-4 leading-tight">{s.heading}</h2>
              <p className="font-body font-light text-base text-charcoal-light leading-relaxed">{s.body}</p>
            </AnimateOnScroll>
          ))}
        </div>
      </section>

      {/* FAQ (mirrored in FAQPage JSON-LD) */}
      <section id="faq" className="py-16 px-6 bg-cream">
        <div className="max-w-[800px] mx-auto">
          <AnimateOnScroll>
            <SectionLabel>Common Questions</SectionLabel>
            <h2 className="font-display font-light text-[clamp(1.6rem,3vw,2.2rem)] text-navy mt-4 mb-4">
              Questions people ask
            </h2>
          </AnimateOnScroll>
          <dl>
            {service.faqs.map((f) => (
              <div key={f.q} className="border-b border-navy/10 py-6">
                <dt className="font-display font-normal text-xl text-navy">{f.q}</dt>
                <dd className="mt-3 font-body font-light text-base text-charcoal-light leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Areas, related reading, other services */}
      <section className="py-16 px-6">
        <div className="max-w-[1200px] mx-auto">
          <AnimateOnScroll>
            <h2 className={`${overline} mb-6`}>Areas served</h2>
            <ul className="flex flex-wrap gap-3 list-none p-0">
              {areas.map((area) => (
                <li key={area.slug}>
                  <Link
                    href={`/areas/${area.slug}`}
                    className="inline-block rounded-full border border-navy/15 px-5 py-2.5 font-ui font-medium text-xs tracking-wider uppercase text-navy hover:border-teal hover:text-teal transition-colors"
                  >
                    {area.name}
                  </Link>
                </li>
              ))}
            </ul>
          </AnimateOnScroll>

          {posts.length > 0 && (
            <AnimateOnScroll>
              <h2 className={`${overline} mt-14 mb-6`}>Related reading</h2>
              <ul className="grid tablet:grid-cols-2 gap-x-12 list-none p-0">
                {posts.map((post) => (
                  <li key={post.slug} className="border-b border-navy/10 py-3">
                    <Link href={`/blog/${post.slug}`} className="font-body font-light text-base text-charcoal hover:text-teal transition-colors">
                      {post.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </AnimateOnScroll>
          )}

          <AnimateOnScroll>
            <h2 className={`${overline} mt-14 mb-6`}>More ways Brenda helps</h2>
            <ul className="flex flex-wrap gap-3 list-none p-0">
              {otherServices.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/services/${s.slug}`}
                    className="inline-block rounded-full border border-gold/50 px-5 py-2.5 font-ui font-medium text-xs tracking-wider uppercase text-navy hover:border-gold hover:text-teal transition-colors"
                  >
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 px-6 bg-navy">
        <AnimateOnScroll>
          <div className="max-w-[600px] mx-auto text-center">
            <h2 className="font-display font-light text-2xl text-cream mb-4">Talk it through with Brenda</h2>
            <p className="font-body font-light text-sage mb-8">
              The first consultation is free, by phone, video or in person.
            </p>
            <Link href="/contact#schedule"><Button variant="gold">Book a Free Consultation</Button></Link>
            <p className="mt-8 font-body font-light text-xs text-sage/60">
              {agent.name}, {agent.title} | DRE License #{agent.dre} | {agent.brokerage}
            </p>
          </div>
        </AnimateOnScroll>
      </section>
    </>
  );
}
