// Email bodies for Home Clarity. Pure (no worker types) so jest and the site build can
// import it; the worker's outbox in worker-lib/homeClarity.ts does the sending.
import { agentStatusLabel } from "./homeClarity";
import { siteConfig } from "../data/site";

export interface HcIntakeRow {
  id: string;
  idempotency_key: string;
  state: string;
  property_address: string;
  full_name: string;
  email: string;
  phone: string | null;
  preferred_contact: string;
  agent_status: string | null;
  questions: string | null;
  consent_version: string;
  consent_at: string;
  source_page: string | null;
  utm: string | null;
  file_key: string | null;
  file_name: string | null;
  file_bytes: number | null;
  file_deleted_at: string | null;
  report_status: string;
  report_url: string | null;
  contact_status: string;
  reviewed_at: string | null;
  crm_contact_id: string | null;
  created_at: string;
  updated_at: string;
  received_at: string | null;
}

function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildHcEmail(
  kind: string,
  intake: HcIntakeRow,
  base: string
): { to: "buyer" | "agent"; subject: string; html: string } | null {
  const wrap = (inner: string) =>
    `<div style="font-family:Georgia,'Times New Roman',serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#2D2D2D;">
      <p style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#C8A55B;margin:0 0 20px;">Brenda Vega&rsquo;s Home Clarity</p>
      ${inner}
      <p style="font-family:Arial,sans-serif;font-size:12px;color:#8a8a8a;margin:32px 0 0;border-top:1px solid #eee;padding-top:16px;">
        Brenda Vega, REALTOR&reg; &middot; ${esc(siteConfig.agent.brokerage)} &middot; DRE #${esc(siteConfig.agent.dre)}<br>
        ${esc(siteConfig.agent.phone)} &middot; ${esc(siteConfig.agent.email)}
      </p>
    </div>`;
  const firstName = intake.full_name.split(" ")[0] || intake.full_name;

  if (kind === "buyer_receipt") {
    return {
      to: "buyer",
      subject: "Your Home Clarity request received",
      html: wrap(
        `<h1 style="font-weight:normal;font-size:26px;color:#0F1D35;margin:0 0 16px;">We received your disclosures.</h1>
         <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;">Hi ${esc(firstName)},</p>
         <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;">Thank you for sending the disclosures for <strong>${esc(intake.property_address)}</strong>. The documents will be analyzed and the key findings, potential concerns, and questions worth asking organized into a report.</p>
         <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;">Brenda will personally reach out to walk you through the findings and discuss your next steps.</p>
         <p style="font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#5A5A5A;">This analysis is complimentary and comes with no obligation. It is an aid for reading the seller&rsquo;s disclosures, not a substitute for the documents themselves, professional inspections, or legal advice. You are not signed up for a newsletter. To ask for your documents to be deleted, reply to this email.</p>`
      ),
    };
  }
  if (kind === "agent_new_request") {
    const rows: [string, string][] = [
      ["Property", intake.property_address],
      ["Name", intake.full_name],
      ["Email", intake.email],
      ["Phone", intake.phone || "Not provided"],
      ["Prefers", intake.preferred_contact === "phone" ? "Phone" : "Email"],
      ["Working with an agent?", agentStatusLabel(intake.agent_status)],
    ];
    if (intake.questions) rows.push(["Questions", intake.questions]);
    return {
      to: "agent",
      subject: "New Home Clarity request",
      html: wrap(
        `<h1 style="font-weight:normal;font-size:24px;color:#0F1D35;margin:0 0 16px;">New disclosure upload</h1>
         <table style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;border-collapse:collapse;width:100%;">
           ${rows
             .map(
               ([label, value]) =>
                 `<tr><td style="padding:6px 12px 6px 0;color:#5A5A5A;vertical-align:top;white-space:nowrap;">${esc(label)}</td><td style="padding:6px 0;">${esc(value)}</td></tr>`
             )
             .join("")}
         </table>
         <p style="margin:24px 0 0;"><a href="${esc(base)}/studio/home-clarity?id=${esc(intake.id)}" style="font-family:Arial,sans-serif;display:inline-block;background:#0F1D35;color:#F8F5EF;padding:12px 22px;text-decoration:none;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Open in your studio</a></p>
         <p style="font-family:Arial,sans-serif;font-size:12px;color:#8a8a8a;margin:16px 0 0;">The PDF is not attached. Sign in to your studio to download it.</p>`
      ),
    };
  }
  return null;
}

