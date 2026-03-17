"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ContactForm() {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "", type: "buyer" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const subject = encodeURIComponent(`New ${formData.type} inquiry from ${formData.name}`);
      const body = encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone}\nType: ${formData.type}\n\nMessage:\n${formData.message}`);
      window.open(`mailto:brenda.vega@c21anew.com?subject=${subject}&body=${body}`, "_self");
      setStatus("sent");
      setFormData({ name: "", email: "", phone: "", message: "", type: "buyer" });
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="bg-teal/10 rounded-2xl p-10 text-center">
        <h3 className="font-display font-light text-2xl text-navy mb-2">Message sent!</h3>
        <p className="font-body font-light text-charcoal-light">Brenda will get back to you within 24 hours.</p>
      </div>
    );
  }

  const inputClass = "w-full font-body font-light text-base text-charcoal bg-cream border border-navy/10 rounded-lg px-4 py-3 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-colors min-h-[48px]";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Full Name *</label>
        <input id="name" type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClass} placeholder="Your full name" />
      </div>
      <div className="grid tablet:grid-cols-2 gap-5">
        <div>
          <label htmlFor="email" className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Email *</label>
          <input id="email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputClass} placeholder="you@email.com" />
        </div>
        <div>
          <label htmlFor="phone" className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Phone *</label>
          <input id="phone" type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={inputClass} placeholder="(555) 123-4567" />
        </div>
      </div>
      <div>
        <label htmlFor="type" className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">I am a...</label>
        <select id="type" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className={inputClass}>
          <option value="buyer">Buyer</option>
          <option value="seller">Seller</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label htmlFor="message" className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Message</label>
        <textarea id="message" rows={4} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className={`${inputClass} resize-none`} placeholder="Tell Brenda how she can help..." />
      </div>
      <Button type="submit" variant="primary" disabled={status === "sending"}>
        {status === "sending" ? "Sending..." : "Send Message"}
      </Button>
      {status === "error" && (
        <p className="font-body font-light text-sm text-red-600">Something went wrong. Please try again or call Brenda directly.</p>
      )}
    </form>
  );
}
