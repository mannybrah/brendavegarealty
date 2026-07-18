import { siteConfig } from "../data/site";
import type { PortalData, MilestoneRow } from "../lib/crm/portalTypes";

const SITE_URL = `https://${siteConfig.domain}`;

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Parse a YYYY-MM-DD date as UTC noon so local-timezone rendering never
// shifts it to the previous/next calendar day.
function friendlyDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00Z`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function sideLabel(side: string): string {
  return side === "seller" ? "sale" : "purchase";
}

function contactButtonsHtml(): string {
  return `
    <div class="contact-buttons">
      <a class="btn btn-primary" href="tel:${siteConfig.agent.phoneRaw}">Call Brenda</a>
      <a class="btn btn-secondary" href="sms:${siteConfig.agent.phoneRaw}">Text Brenda</a>
      <a class="btn btn-secondary" href="mailto:${siteConfig.agent.email}">Email Brenda</a>
    </div>`;
}

function headerHtml(): string {
  // Known asset — see public/images/brenda-headshot.jpg.
  const photoUrl = "/images/brenda-headshot.jpg";
  return `
    <div class="agent-header">
      <img class="agent-photo" src="${photoUrl}" alt="${escapeHtml(siteConfig.agent.name)}" />
      <div class="agent-info">
        <div class="agent-name">${escapeHtml(siteConfig.agent.name)}</div>
        <div class="agent-title">${escapeHtml(siteConfig.agent.title)} &middot; DRE #${escapeHtml(
    siteConfig.agent.dre
  )}</div>
      </div>
    </div>`;
}

function progressPercent(milestones: MilestoneRow[]): number {
  if (milestones.length === 0) return 0;
  const done = milestones.filter((m) => m.status === "done").length;
  return Math.round((done / milestones.length) * 100);
}

function renderTimeline(milestones: MilestoneRow[]): string {
  const firstUpcomingIndex = milestones.findIndex((m) => m.status !== "done" && m.status !== "skipped");

  return `
    <div class="timeline">
      ${milestones
        .map((m, i) => {
          const isDone = m.status === "done";
          const isCurrent = i === firstUpcomingIndex;
          const stateClass = isDone ? "tl-done" : isCurrent ? "tl-current" : "tl-upcoming";
          const marker = isDone ? "&#10003;" : "";
          const dateHtml = m.date ? `<div class="tl-date">${escapeHtml(friendlyDate(m.date))}</div>` : "";
          const hereBadge = isCurrent ? `<div class="tl-here">You are here</div>` : "";
          return `
        <div class="tl-item ${stateClass}">
          <div class="tl-marker">${marker}</div>
          <div class="tl-content">
            <div class="tl-title">${escapeHtml(m.title)}</div>
            ${dateHtml}
            ${hereBadge}
          </div>
        </div>`;
        })
        .join("")}
    </div>`;
}

function renderKeyDates(deal: PortalData["deal"], milestones: MilestoneRow[]): string {
  const nextStep = milestones.find((m) => m.status !== "done" && m.status !== "skipped");
  const rows: string[] = [];
  if (nextStep) {
    rows.push(`
      <div class="key-date-row">
        <div class="key-date-label">Next step</div>
        <div class="key-date-value">${escapeHtml(nextStep.title)}${
      nextStep.date ? ` &mdash; ${escapeHtml(friendlyDate(nextStep.date))}` : ""
    }</div>
      </div>`);
  }
  if (deal.target_close_date) {
    rows.push(`
      <div class="key-date-row">
        <div class="key-date-label">Target close</div>
        <div class="key-date-value">${escapeHtml(friendlyDate(deal.target_close_date))}</div>
      </div>`);
  }
  if (rows.length === 0) return "";
  return `
    <div class="key-dates-card">
      ${rows.join("")}
    </div>`;
}

const SHARED_STYLE = `
  :root {
    --navy: #0F1D35;
    --gold: #C8A55B;
    --cream: #F8F5EF;
    --teal: #2A7F6F;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Outfit', system-ui, -apple-system, sans-serif;
    background: var(--cream);
    color: var(--navy);
    font-weight: 300;
    line-height: 1.6;
  }
  h1, h2 { font-family: 'Cormorant Garamond', Georgia, serif; }
  a { color: inherit; }
  .wrap { max-width: 640px; margin: 0 auto; padding: 0 0 48px; }
  .topbar {
    background: var(--navy);
    padding: 16px 20px;
    text-align: center;
  }
  .topbar .brand { color: var(--cream); font-family: 'Cormorant Garamond', serif; font-size: 1.1rem; letter-spacing: 0.15em; text-transform: uppercase; }
  .topbar .gold { color: var(--gold); }
  .agent-header {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 24px 20px;
  }
  .agent-photo {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--gold);
  }
  .agent-name { font-weight: 500; font-size: 1.05rem; }
  .agent-title { font-size: 0.8rem; color: var(--teal); }
  .monogram {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--navy);
    color: var(--gold);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.3rem;
    border: 2px solid var(--gold);
  }
  main { padding: 0 20px; }
  h1 { font-size: clamp(1.6rem, 6vw, 2.2rem); font-weight: 400; margin: 0 0 6px; }
  .address { color: var(--teal); font-size: 0.95rem; margin: 0 0 24px; }
  .progress-wrap { margin: 24px 0; }
  .progress-label { display: flex; justify-content: space-between; font-size: 0.8rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--teal); margin-bottom: 8px; }
  .progress-track { background: rgba(15,29,53,0.08); border-radius: 999px; height: 10px; overflow: hidden; }
  .progress-fill { background: var(--gold); height: 100%; border-radius: 999px; }
  .key-dates-card {
    background: white;
    border: 1px solid rgba(200,165,91,0.3);
    border-radius: 6px;
    padding: 16px 20px;
    margin: 24px 0;
  }
  .key-date-row { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-top: 1px solid rgba(15,29,53,0.08); }
  .key-date-row:first-child { border-top: none; }
  .key-date-label { font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--teal); }
  .key-date-value { font-weight: 500; text-align: right; }
  .timeline { margin: 32px 0; position: relative; }
  .tl-item { display: flex; gap: 14px; padding-bottom: 24px; position: relative; }
  .tl-item::before {
    content: "";
    position: absolute;
    left: 11px;
    top: 26px;
    bottom: 0;
    width: 2px;
    background: rgba(15,29,53,0.1);
  }
  .tl-item:last-child::before { display: none; }
  .tl-item.tl-done::before { background: var(--gold); }
  .tl-marker {
    flex: 0 0 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(15,29,53,0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    color: var(--navy);
    z-index: 1;
  }
  .tl-done .tl-marker { background: var(--gold); color: var(--navy); }
  .tl-current .tl-marker { background: var(--navy); box-shadow: 0 0 0 4px rgba(200,165,91,0.35); }
  .tl-title { font-weight: 500; }
  .tl-upcoming .tl-title { color: rgba(15,29,53,0.5); font-weight: 300; }
  .tl-date { font-size: 0.8rem; color: var(--teal); margin-top: 2px; }
  .tl-here { display: inline-block; margin-top: 4px; font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; background: var(--gold); color: var(--navy); padding: 2px 8px; border-radius: 3px; }
  .contact-buttons { display: flex; flex-wrap: wrap; gap: 10px; margin: 32px 0 0; }
  .btn { flex: 1 1 auto; text-align: center; display: inline-block; padding: 13px 16px; border-radius: 4px; text-decoration: none; font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase; }
  .btn-primary { background: var(--gold); color: var(--navy); }
  .btn-secondary { background: var(--navy); color: var(--cream); }
  footer { text-align: center; padding: 32px 20px 0; font-size: 0.72rem; color: rgba(15,29,53,0.5); }
`;

const HEAD_ASSETS = `
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Outfit:wght@300;400;500;600&display=swap"
  rel="stylesheet"
/>`;

export function renderPortalPage(data: PortalData): string {
  const { deal, contactFirstName, milestones } = data;
  const firstName = contactFirstName.trim() || "Your";
  const headline = `${escapeHtml(firstName)}&#39;s home ${sideLabel(deal.side)}`;
  const addressSafe = escapeHtml(deal.property_address || "");
  const percent = progressPercent(milestones);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow">
<title>${headline} | ${escapeHtml(siteConfig.name)}</title>
${HEAD_ASSETS}
<style>${SHARED_STYLE}</style>
</head>
<body>
  <div class="topbar"><span class="brand">Brenda <span class="gold">Vega</span> Realty</span></div>
  <div class="wrap">
    ${headerHtml()}
    <main>
      <h1>${headline}</h1>
      ${addressSafe ? `<p class="address">${addressSafe}</p>` : ""}

      <div class="progress-wrap">
        <div class="progress-label"><span>Progress</span><span>${percent}%</span></div>
        <div class="progress-track"><div class="progress-fill" style="width: ${percent}%"></div></div>
      </div>

      ${renderKeyDates(deal, milestones)}

      ${renderTimeline(milestones)}

      ${contactButtonsHtml()}
    </main>
    <footer>
      DRE License #${escapeHtml(siteConfig.agent.dre)} &middot; ${escapeHtml(siteConfig.agent.brokerage)}
    </footer>
  </div>
</body>
</html>`;
}

export function renderPortalExpiredPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow">
<title>Link expired | ${escapeHtml(siteConfig.name)}</title>
${HEAD_ASSETS}
<style>${SHARED_STYLE}</style>
</head>
<body>
  <div class="topbar"><span class="brand">Brenda <span class="gold">Vega</span> Realty</span></div>
  <div class="wrap">
    ${headerHtml()}
    <main>
      <h1>This link is no longer active</h1>
      <p class="address">Text Brenda for a fresh one and she'll get you sorted right away.</p>
      ${contactButtonsHtml()}
    </main>
    <footer>
      DRE License #${escapeHtml(siteConfig.agent.dre)} &middot; ${escapeHtml(siteConfig.agent.brokerage)}
    </footer>
  </div>
</body>
</html>`;
}
