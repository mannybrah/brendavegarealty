"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/listings", label: "Listings" },
  { href: "/areas", label: "Areas" },
  { href: "/testimonials", label: "Testimonials" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-sm"
            : "bg-transparent"
        }`}
      >
        <nav className="max-w-[1200px] mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/logo-icon.svg"
              alt=""
              width={28}
              height={28}
              aria-hidden="true"
            />
            <span className="font-display font-normal text-[1.4rem] tracking-[0.15em] uppercase text-navy">
              Brenda <span className="text-gold">Vega</span>
            </span>
          </Link>

          <ul className="hidden desktop:flex gap-8 items-center list-none">
            {navLinks.slice(0, 5).map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="font-body font-normal text-[0.8rem] tracking-[0.1em] uppercase text-charcoal-light hover:text-gold transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {/* Calculators Dropdown */}
            <li className="relative group">
              <span className="cursor-pointer font-body font-normal text-[0.8rem] tracking-[0.1em] uppercase text-charcoal-light hover:text-gold transition-colors">
                Calculators
              </span>
              <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="bg-white rounded-lg shadow-lg border border-navy/5 py-2 min-w-[220px]">
                  <Link href="/calculators/qualify" className="block px-4 py-2 text-sm font-body text-charcoal hover:bg-cream hover:text-gold transition-colors">
                    Do I Qualify?
                  </Link>
                  <Link href="/calculators/costs" className="block px-4 py-2 text-sm font-body text-charcoal hover:bg-cream hover:text-gold transition-colors">
                    Mortgage & Closing Costs
                  </Link>
                </div>
              </div>
            </li>
            <li>
              <Link
                href="/contact"
                className="font-body font-normal text-[0.8rem] tracking-[0.1em] uppercase text-charcoal-light hover:text-gold transition-colors"
              >
                Contact
              </Link>
            </li>
          </ul>

          <div className="hidden desktop:block">
            <Link href="/contact#schedule">
              <Button variant="primary">Book Consultation</Button>
            </Link>
          </div>

          <button
            className="desktop:hidden flex flex-col gap-[5px] w-6 p-0 bg-transparent border-none cursor-pointer"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
          >
            <span
              className={`block h-[1.5px] w-full bg-navy rounded transition-all ${
                isMobileMenuOpen ? "rotate-45 translate-y-[6.5px]" : ""
              }`}
            />
            <span
              className={`block h-[1.5px] bg-navy rounded transition-all ${
                isMobileMenuOpen ? "opacity-0" : "w-[70%] ml-auto"
              }`}
            />
            <span
              className={`block h-[1.5px] w-full bg-navy rounded transition-all ${
                isMobileMenuOpen ? "-rotate-45 -translate-y-[6.5px]" : ""
              }`}
            />
          </button>
        </nav>
      </header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-navy flex flex-col items-center justify-center gap-8 desktop:hidden"
          >
            {navLinks.slice(0, 5).map((link, i) => (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Link
                  href={link.href}
                  className="font-display font-light text-3xl text-cream tracking-wider hover:text-gold transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}
            {/* Calculators expandable section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 5 * 0.08 }}
              className="flex flex-col items-center"
            >
              <button
                onClick={() => setCalcOpen(!calcOpen)}
                className="font-display font-light text-3xl text-cream tracking-wider hover:text-gold transition-colors"
              >
                Calculators {calcOpen ? "\u2212" : "+"}
              </button>
              {calcOpen && (
                <div className="mt-3 space-y-3 flex flex-col items-center">
                  <Link
                    href="/calculators/qualify"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="font-body font-light text-xl text-cream/70 hover:text-gold transition-colors"
                  >
                    Do I Qualify?
                  </Link>
                  <Link
                    href="/calculators/costs"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="font-body font-light text-xl text-cream/70 hover:text-gold transition-colors"
                  >
                    Mortgage & Closing Costs
                  </Link>
                </div>
              )}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 6 * 0.08 }}
            >
              <Link
                href="/contact"
                className="font-display font-light text-3xl text-cream tracking-wider hover:text-gold transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Contact
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 7 * 0.08 }}
            >
              <Link
                href="/contact#schedule"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Button variant="gold">Book Consultation</Button>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
