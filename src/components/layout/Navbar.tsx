"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/listings", label: "Listings" },
  { href: "/areas", label: "Communities" },
  { href: "/home-clarity", label: "Home Clarity" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

const moreLinks = [
  { href: "/services", label: "Services" },
  { href: "/testimonials", label: "Testimonials" },
  { href: "/calculators/qualify", label: "Do I Qualify?" },
  { href: "/calculators/costs", label: "Mortgage & Closing Costs" },
];

export function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Escape closes the menu; the page behind it does not scroll while it is open
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  // Pages whose first section is dark and runs under the header
  const overPhoto = (pathname === "/" || pathname === "/home-clarity") && !isScrolled && !isOpen;
  const ink = overPhoto ? "text-cream" : "text-navy";
  const linkInk = overPhoto ? "text-cream/85 hover:text-white" : "text-charcoal-light hover:text-navy";
  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,box-shadow] duration-300 ${
          isOpen
            ? "bg-navy"
            : isScrolled
              ? "bg-warm-white/95 backdrop-blur-md shadow-[0_1px_0_rgba(15,29,53,0.08)]"
              : "bg-transparent"
        }`}
      >
        {!isOpen && <AnnouncementBar />}
        <nav aria-label="Main" className="max-w-[1280px] mx-auto flex items-center justify-between px-6 desktop:px-10 h-[72px]">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className={`font-display font-normal text-[1.45rem] tracking-[0.18em] uppercase leading-none ${isOpen ? "text-cream" : ink}`}
          >
            Brenda <span className="text-gold">Vega</span>
          </Link>

          <ul className="hidden desktop:flex gap-8 items-center list-none m-0 p-0">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={`font-body font-normal text-[0.76rem] tracking-[0.14em] uppercase transition-colors ${linkInk} ${
                    isActive(link.href) ? "underline underline-offset-[10px] decoration-gold decoration-1" : ""
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <Link
            href="/contact#schedule"
            className={`hidden desktop:inline-flex items-center font-ui font-medium text-[0.7rem] tracking-[0.14em] uppercase px-5 h-10 border transition-colors ${
              overPhoto
                ? "border-cream/60 text-cream hover:bg-cream hover:text-navy"
                : "border-navy text-navy hover:bg-navy hover:text-cream"
            }`}
          >
            Book a consultation
          </Link>

          <button
            type="button"
            className="desktop:hidden relative w-11 h-11 -mr-2 flex items-center justify-center bg-transparent border-none cursor-pointer"
            onClick={() => setIsOpen((v) => !v)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
          >
            <span className="relative block w-6 h-[14px]" aria-hidden="true">
              <span
                className={`absolute left-0 right-0 h-[1.5px] transition-transform duration-300 ${isOpen || overPhoto ? "bg-cream" : "bg-navy"} ${
                  isOpen ? "top-[6px] rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute left-0 right-0 top-[6px] h-[1.5px] transition-opacity duration-200 ${isOpen || overPhoto ? "bg-cream" : "bg-navy"} ${
                  isOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 right-0 h-[1.5px] transition-transform duration-300 ${isOpen || overPhoto ? "bg-cream" : "bg-navy"} ${
                  isOpen ? "top-[6px] -rotate-45" : "top-[12px]"
                }`}
              />
            </span>
          </button>
        </nav>
      </header>

      {isOpen && (
        <div
          id="mobile-menu"
          className="fixed inset-0 z-40 bg-navy desktop:hidden overflow-y-auto pt-[88px] pb-28 px-8"
        >
          <ul className="list-none m-0 p-0 border-t border-cream/10">
            {navLinks.map((link) => (
              <li key={link.href} className="border-b border-cream/10">
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  onClick={() => setIsOpen(false)}
                  className="block py-4 font-display font-light text-[1.9rem] text-cream hover:text-gold transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="list-none m-0 p-0 mt-6 grid grid-cols-2 gap-x-6 gap-y-3">
            {moreLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block py-1 font-body font-light text-sm text-cream/70 hover:text-gold transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/contact#schedule"
            onClick={() => setIsOpen(false)}
            className="mt-8 flex items-center justify-center h-12 bg-gold text-navy font-ui font-medium text-[0.78rem] tracking-[0.14em] uppercase"
          >
            Book a consultation
          </Link>
        </div>
      )}
    </>
  );
}
