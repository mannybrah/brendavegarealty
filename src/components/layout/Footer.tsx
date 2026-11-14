import Link from "next/link";
import { siteConfig } from "@/data/site";

const explore = [
  { href: "/about", label: "About Brenda" },
  { href: "/listings", label: "Listings" },
  { href: "/areas", label: "Communities" },
  { href: "/home-clarity", label: "Home Clarity" },
  { href: "/services", label: "Services" },
  { href: "/testimonials", label: "Testimonials" },
];

const resources = [
  { href: "/blog", label: "Blog" },
  { href: "/updates", label: "Latest updates" },
  { href: "/calculators/qualify", label: "Do I qualify?" },
  { href: "/calculators/costs", label: "Mortgage & closing costs" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy policy" },
];

const linkClass = "font-body font-light text-sm text-cream/65 hover:text-cream transition-colors";
const headingClass = "font-body font-medium text-[0.65rem] tracking-[0.3em] uppercase text-gold mb-5";

export function Footer() {
  const social = [
    { href: siteConfig.social.instagram, label: "Instagram" },
    { href: siteConfig.social.facebook, label: "Facebook" },
    { href: siteConfig.social.linkedin, label: "LinkedIn" },
  ].filter((s) => s.href);

  return (
    <footer className="bg-navy text-cream px-6 desktop:px-10 pt-20 pb-10">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid gap-12 desktop:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="font-display font-light text-[2rem] tracking-[0.18em] uppercase leading-none">
              Brenda <span className="text-gold">Vega</span>
            </div>
            <p className="font-display italic font-light text-lg text-cream/70 mt-4 max-w-[300px]">
              Local perspective. Human connection.
            </p>
          </div>

          <nav aria-label="Explore">
            <h2 className={headingClass}>Explore</h2>
            <ul className="space-y-2.5 list-none p-0 m-0">
              {explore.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Resources">
            <h2 className={headingClass}>Resources</h2>
            <ul className="space-y-2.5 list-none p-0 m-0">
              {resources.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className={headingClass}>Contact</h2>
            <ul className="space-y-2.5 list-none p-0 m-0">
              <li>
                <a href={`tel:${siteConfig.agent.phoneRaw}`} className={linkClass}>
                  {siteConfig.agent.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${siteConfig.agent.email}`} className={`${linkClass} break-all`}>
                  {siteConfig.agent.email}
                </a>
              </li>
              <li>
                <Link href="/contact#schedule" className={linkClass}>
                  Book a consultation
                </Link>
              </li>
              {social.map((s) => (
                <li key={s.label}>
                  <a href={s.href} className={linkClass} target="_blank" rel="noopener noreferrer">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-cream/10 mt-16 pt-8 flex flex-col desktop:flex-row gap-5 desktop:items-center desktop:justify-between">
          <div className="flex items-start gap-4">
            <svg viewBox="0 0 48 48" className="w-9 h-9 shrink-0 text-cream/70" role="img" aria-label="Equal Housing Opportunity">
              <path fill="currentColor" d="M24 4 3 17v5h4v20h34V22h4v-5L24 4Zm11 32H13V18.6l11-6.8 11 6.8V36Z" />
              <path fill="currentColor" d="M18 22h12v4H18zm0 6h12v4H18z" />
            </svg>
            <p className="font-body font-light text-xs text-cream/55 leading-relaxed max-w-[560px]">
              {siteConfig.agent.name}, {siteConfig.agent.title} &middot; {siteConfig.agent.brokerage} &middot; DRE #
              {siteConfig.agent.dre}. Equal Housing Opportunity. We are committed to the letter and spirit of U.S.
              policy for the achievement of equal housing opportunity throughout the Nation.
            </p>
          </div>
          <p className="font-body font-light text-xs text-cream/40 shrink-0">
            &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
