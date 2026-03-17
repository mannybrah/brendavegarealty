import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit, DM_Sans } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MobileCTABar } from "@/components/layout/MobileCTABar";
import { CookieConsent } from "@/components/ui/CookieConsent";
import { siteConfig } from "@/data/site";
import { getLocalBusinessSchema } from "@/lib/seo";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ui",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} | Bay Area Real Estate`,
    template: `%s | ${siteConfig.name}`,
  },
  description:
    "Brenda Vega — your trusted Bay Area real estate expert. Serving Campbell, San Jose, and Northern California with dedication and heart.",
  keywords: [
    "realtor Campbell CA",
    "Bay Area real estate agent",
    "homes for sale Campbell",
    "Brenda Vega realtor",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${outfit.variable} ${dmSans.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(getLocalBusinessSchema()),
          }}
        />
      </head>
      <body>
        <Navbar />
        <main className="pt-[72px] pb-[60px] desktop:pb-0">{children}</main>
        <Footer />
        <MobileCTABar />
        <CookieConsent />
      </body>
    </html>
  );
}
