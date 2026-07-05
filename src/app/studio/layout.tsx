import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Studio — Brenda Vega",
  robots: { index: false, follow: false },
  manifest: "/studio-manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "BV Studio" },
  icons: { apple: "/images/studio-icon-192.png" },
};

export const viewport: Viewport = { themeColor: "#0F1D35" };

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
