"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { MobileCTABar } from "./MobileCTABar";
import { CookieConsent } from "@/components/ui/CookieConsent";

export function SiteChromeNav() {
  const pathname = usePathname();
  if (pathname?.startsWith("/studio")) return null;
  return <Navbar />;
}

export function SiteChromeFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/studio")) return null;
  return <Footer />;
}

export function SiteChromeExtras() {
  const pathname = usePathname();
  if (pathname?.startsWith("/studio")) return null;
  return (
    <>
      <MobileCTABar />
      <CookieConsent />
    </>
  );
}

export function SiteMainPadding({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStudio = pathname?.startsWith("/studio");
  return (
    <main className={isStudio ? "" : "pt-[72px] pb-[60px] desktop:pb-0"}>
      {children}
    </main>
  );
}
