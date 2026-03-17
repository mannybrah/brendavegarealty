import Link from "next/link";
import { siteConfig } from "@/data/site";

export function Footer() {
  return (
    <footer className="bg-navy py-16 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-12">
          <div className="font-display font-light text-3xl tracking-[0.2em] text-cream uppercase mb-2">
            Brenda <span className="text-gold">Vega</span>
          </div>
          <p className="font-display italic font-light text-sage">
            {siteConfig.tagline}
          </p>
        </div>

        <div className="grid grid-cols-2 desktop:grid-cols-4 gap-8 mb-12">
          <div>
            <h4 className="font-body font-medium text-xs tracking-[0.2em] uppercase text-gold mb-4">
              Navigate
            </h4>
            <ul className="space-y-2 list-none p-0">
              {["Home", "About", "Listings", "Areas", "Testimonials", "Contact"].map((item) => (
                <li key={item}>
                  <Link
                    href={`/${item === "Home" ? "" : item.toLowerCase()}`}
                    className="font-body font-light text-sm text-sage hover:text-cream transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-body font-medium text-xs tracking-[0.2em] uppercase text-gold mb-4">
              Contact
            </h4>
            <ul className="space-y-2 list-none p-0">
              <li>
                <a
                  href={`tel:${siteConfig.agent.phoneRaw}`}
                  className="font-body font-light text-sm text-sage hover:text-cream transition-colors"
                >
                  {siteConfig.agent.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${siteConfig.agent.email}`}
                  className="font-body font-light text-sm text-sage hover:text-cream transition-colors"
                >
                  {siteConfig.agent.email}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-body font-medium text-xs tracking-[0.2em] uppercase text-gold mb-4">
              Legal
            </h4>
            <ul className="space-y-2 list-none p-0">
              <li>
                <Link
                  href="/privacy"
                  className="font-body font-light text-sm text-sage hover:text-cream transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-body font-medium text-xs tracking-[0.2em] uppercase text-gold mb-4">
              Follow
            </h4>
            <ul className="space-y-2 list-none p-0">
              {siteConfig.social.instagram && (
                <li>
                  <a href={siteConfig.social.instagram} className="font-body font-light text-sm text-sage hover:text-cream transition-colors" target="_blank" rel="noopener noreferrer">
                    Instagram
                  </a>
                </li>
              )}
              {siteConfig.social.facebook && (
                <li>
                  <a href={siteConfig.social.facebook} className="font-body font-light text-sm text-sage hover:text-cream transition-colors" target="_blank" rel="noopener noreferrer">
                    Facebook
                  </a>
                </li>
              )}
              {siteConfig.social.linkedin && (
                <li>
                  <a href={siteConfig.social.linkedin} className="font-body font-light text-sm text-sage hover:text-cream transition-colors" target="_blank" rel="noopener noreferrer">
                    LinkedIn
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 text-center space-y-2">
          <p className="font-body font-light text-xs text-sage/60">
            DRE License #{siteConfig.agent.dre} | {siteConfig.agent.brokerage}
          </p>
          <p className="font-body font-light text-xs text-sage/60">
            We are committed to the letter and spirit of U.S. policy for the achievement of equal housing opportunity throughout the Nation.
          </p>
          <p className="font-body font-light text-xs text-sage/40">
            &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
