import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-[800px] mx-auto">
        <h1 className="font-display font-light text-3xl text-navy mb-8">Privacy Policy</h1>
        <div className="font-body font-light text-charcoal-light space-y-4 leading-relaxed">
          <p>Last updated: March 16, 2026</p>

          <h2 className="font-display font-normal text-xl text-navy mt-8">Information We Collect</h2>
          <p>When you use our website, we may collect personal information you voluntarily provide, including your name, email address, phone number, and any messages submitted through our contact or scheduling forms.</p>

          <h2 className="font-display font-normal text-xl text-navy mt-8">How We Use Your Information</h2>
          <p>We use your information to respond to inquiries, schedule consultations, and provide real estate services. Your contact information may be stored in our customer relationship management (CRM) system to improve our service to you.</p>

          <h2 className="font-display font-normal text-xl text-navy mt-8">Analytics</h2>
          <p>We use Google Analytics to understand how visitors interact with our website. This service collects anonymous usage data including pages visited and time spent on site.</p>

          <h2 className="font-display font-normal text-xl text-navy mt-8">Your Rights</h2>
          <p>You may request to view, update, or delete your personal information at any time by contacting us at brenda.vega@c21anew.com or (501) 827-9619.</p>

          <h2 className="font-display font-normal text-xl text-navy mt-8">Contact</h2>
          <p>For questions about this privacy policy, contact Brenda Vega at brenda.vega@c21anew.com.</p>
        </div>
      </div>
    </section>
  );
}
