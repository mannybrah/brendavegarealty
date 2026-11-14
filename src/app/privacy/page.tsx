import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-[800px] mx-auto">
        <h1 className="font-display font-light text-3xl text-navy mb-8">Privacy Policy</h1>
        <div className="font-body font-light text-charcoal-light space-y-4 leading-relaxed">
          <p>Last updated: November 13, 2026</p>

          <h2 className="font-display font-normal text-xl text-navy mt-8">Information We Collect</h2>
          <p>When you use our website, we may collect personal information you voluntarily provide, including your name, email address, phone number, and any messages submitted through our contact or scheduling forms.</p>

          <h2 className="font-display font-normal text-xl text-navy mt-8">How We Use Your Information</h2>
          <p>We use your information to respond to inquiries, schedule consultations, and provide real estate services. Your contact information may be stored in our customer relationship management (CRM) system to improve our service to you.</p>

          <h2 id="home-clarity" className="font-display font-normal text-xl text-navy mt-8 scroll-mt-24">Brenda Vega&rsquo;s Home Clarity (disclosure uploads)</h2>
          <p>When you upload a disclosure document, we collect the property address, your name, email address, optional phone number, your preferred contact method, your optional answer about working with an agent, any questions you add, and the PDF itself.</p>
          <p>Your document and details go to Brenda Vega. The document is analyzed using a third-party AI disclosure-analysis service to prepare your report, and Brenda uses your contact details to follow up with you personally about it. Submitting the form does not sign you up for a newsletter, and we do not sell your information.</p>
          <p>Uploaded PDFs are stored privately, are never published on this website, and are deleted automatically after 90 days. Your request details are kept as part of our client records. You can ask us to delete your document, your report, and your details at any time using the contact information below.</p>

          <h2 className="font-display font-normal text-xl text-navy mt-8">Analytics</h2>
          <p>We use Google Analytics to understand how visitors interact with our website. This service collects anonymous usage data including pages visited and time spent on site.</p>

          <h2 className="font-display font-normal text-xl text-navy mt-8">Your Rights</h2>
          <p>You may request to view, update, or delete your personal information at any time by contacting us at brenda@brendavegarealty.com or (501) 827-9619.</p>

          <h2 className="font-display font-normal text-xl text-navy mt-8">Contact</h2>
          <p>For questions about this privacy policy, contact Brenda Vega at brenda@brendavegarealty.com.</p>
        </div>
      </div>
    </section>
  );
}
