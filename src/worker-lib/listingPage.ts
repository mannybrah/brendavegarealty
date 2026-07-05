import { Listing, LISTING_STATUS_LABELS, futureOpenHouses } from "../lib/listing";
import { siteConfig } from "../data/site";

const SITE_URL = `https://${siteConfig.domain}`;

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mediaUrl(key: string): string {
  // Keys are R2 object names we generated ourselves (listing/<uuid>/<n>.jpg) —
  // safe to interpolate directly, but still confined to a controlled charset.
  return `/media/${key}`;
}

function absoluteMediaUrl(key: string): string {
  return `${SITE_URL}${mediaUrl(key)}`;
}

function todayPacific(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}

function formatOpenHouseDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD; parse as a local (Pacific-agnostic) calendar date
  // to avoid UTC off-by-one shifts.
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  let h = Number(hStr);
  const m = mStr ?? "00";
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${suffix}`;
}

function renderFacts(listing: Listing): string {
  const facts: Array<{ label: string; value: string }> = [];
  if (listing.beds !== null) facts.push({ label: "Beds", value: String(listing.beds) });
  if (listing.baths !== null) facts.push({ label: "Baths", value: String(listing.baths) });
  if (listing.sqft !== null) facts.push({ label: "Sq Ft", value: listing.sqft.toLocaleString("en-US") });
  if (listing.lotSize) facts.push({ label: "Lot Size", value: listing.lotSize });
  if (facts.length === 0) return "";
  return `
    <div class="facts-row">
      ${facts
        .map(
          (f) => `
        <div class="fact">
          <div class="fact-value">${escapeHtml(f.value)}</div>
          <div class="fact-label">${escapeHtml(f.label)}</div>
        </div>`
        )
        .join("")}
    </div>`;
}

function renderFeatures(listing: Listing): string {
  if (listing.features.length === 0) return "";
  return `
    <div class="features-block">
      <h2>Features &amp; Upgrades</h2>
      <ul class="features-list">
        ${listing.features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}
      </ul>
    </div>`;
}

function renderGallery(listing: Listing): string {
  if (listing.photoKeys.length === 0) return "";
  return `
    <div class="gallery-block">
      <h2>Photos</h2>
      <div class="photo-grid">
        ${listing.photoKeys
          .map((key) => {
            const src = mediaUrl(key);
            return `<a href="${src}" target="_blank" rel="noopener noreferrer" class="photo-item"><img src="${src}" alt="${escapeHtml(
              listing.address
            )} photo" loading="lazy" /></a>`;
          })
          .join("")}
      </div>
    </div>`;
}

function renderOpenHouses(listing: Listing): string {
  const upcoming = futureOpenHouses(listing.openHouses, todayPacific());
  if (upcoming.length === 0) return "";
  return `
    <div class="open-house-block">
      <div class="open-house-badge">Open House</div>
      ${upcoming
        .map(
          (oh) => `
        <div class="open-house-row">
          <span class="oh-date">${escapeHtml(formatOpenHouseDate(oh.date))}</span>
          <span class="oh-time">${escapeHtml(formatTime(oh.start))} &ndash; ${escapeHtml(formatTime(oh.end))}</span>
        </div>`
        )
        .join("")}
    </div>`;
}

function buildJsonLd(listing: Listing, coverUrl: string | null): string {
  const priceNumeric = listing.price ? listing.price.replace(/[^0-9.]/g, "") : "";
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    url: `${SITE_URL}/listings/${listing.slug}`,
    datePosted: listing.publishedAt ?? listing.createdAt.slice(0, 10),
    about: {
      "@type": "SingleFamilyResidence",
      name: listing.address || undefined,
      address: {
        "@type": "PostalAddress",
        streetAddress: listing.address || undefined,
        addressLocality: listing.city || undefined,
        addressRegion: "CA",
      },
      ...(listing.sqft !== null
        ? { floorSize: { "@type": "QuantitativeValue", value: listing.sqft, unitCode: "FTK" } }
        : {}),
      ...(listing.beds !== null ? { numberOfRooms: listing.beds } : {}),
      ...(listing.baths !== null ? { numberOfBathroomsTotal: listing.baths } : {}),
    },
    ...(coverUrl ? { image: coverUrl } : {}),
    ...(priceNumeric ? { offers: { "@type": "Offer", price: priceNumeric, priceCurrency: "USD" } } : {}),
  };
  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
}

export function renderListingPage(listing: Listing): string {
  const cover = listing.photoKeys[listing.coverIndex] ?? listing.photoKeys[0];
  const coverUrl = cover ? mediaUrl(cover) : null;
  const coverAbsoluteUrl = cover ? absoluteMediaUrl(cover) : null;

  const addressSafe = escapeHtml(listing.address || "Property");
  const citySafe = escapeHtml(listing.city);
  const statusLabel = escapeHtml(LISTING_STATUS_LABELS[listing.status]);
  const priceSafe = listing.price ? escapeHtml(listing.price) : "";

  const metaDescriptionSource =
    listing.description.replace(/\s+/g, " ").trim().slice(0, 155) ||
    `${listing.address}${listing.city ? `, ${listing.city}` : ""} — listed by Brenda Vega, Century 21.`;
  const metaDescription = escapeHtml(metaDescriptionSource);

  const descriptionHtml = listing.description
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");

  const pageTitle = `${listing.address || "Listing"}${listing.city ? `, ${listing.city}` : ""} | ${
    siteConfig.name
  }`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(pageTitle)}</title>
<meta name="description" content="${metaDescription}" />
<meta property="og:title" content="${escapeHtml(pageTitle)}" />
<meta property="og:description" content="${metaDescription}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${SITE_URL}/listings/${escapeHtml(listing.slug)}" />
${coverAbsoluteUrl ? `<meta property="og:image" content="${escapeHtml(coverAbsoluteUrl)}" />` : ""}
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Outfit:wght@300;400;500;600&display=swap"
  rel="stylesheet"
/>
<script type="application/ld+json">${buildJsonLd(listing, coverAbsoluteUrl)}</script>
<style>
  :root {
    --navy: #0F1D35;
    --gold: #C8A55B;
    --cream: #F8F5EF;
    --teal: #2A7F6F;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Outfit', system-ui, sans-serif;
    background: var(--cream);
    color: var(--navy);
    font-weight: 300;
    line-height: 1.6;
  }
  h1, h2, .signature { font-family: 'Cormorant Garamond', Georgia, serif; }
  a { color: inherit; }
  .topbar {
    background: var(--navy);
    padding: 16px 20px;
  }
  .topbar a {
    color: var(--cream);
    text-decoration: none;
    font-size: 0.85rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }
  .topbar .gold { color: var(--gold); }
  .hero {
    position: relative;
    min-height: 60vh;
    background-color: var(--navy);
    background-size: cover;
    background-position: center;
    display: flex;
    align-items: flex-end;
    color: var(--cream);
  }
  .hero::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(15,29,53,0.15) 0%, rgba(15,29,53,0.85) 100%);
  }
  .hero-inner {
    position: relative;
    z-index: 1;
    padding: 40px 20px;
    width: 100%;
    max-width: 1100px;
    margin: 0 auto;
  }
  .status-badge {
    display: inline-block;
    background: var(--gold);
    color: var(--navy);
    font-size: 0.75rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    font-weight: 500;
    padding: 6px 14px;
    border-radius: 4px;
    margin-bottom: 14px;
  }
  .hero h1 {
    font-size: clamp(2rem, 5vw, 3.2rem);
    font-weight: 400;
    margin: 0 0 8px;
  }
  .hero .city {
    font-size: 1.1rem;
    opacity: 0.85;
    margin: 0 0 14px;
  }
  .hero .price {
    font-size: clamp(1.4rem, 3vw, 2rem);
    color: var(--gold);
    font-weight: 500;
  }
  main {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 20px 60px;
  }
  .facts-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    margin: 32px 0;
    padding: 24px;
    background: white;
    border-radius: 6px;
    border: 1px solid rgba(15,29,53,0.08);
  }
  @media (min-width: 640px) {
    .facts-row { grid-template-columns: repeat(4, 1fr); }
  }
  .fact { text-align: center; }
  .fact-value { font-size: 1.4rem; font-weight: 500; color: var(--navy); }
  .fact-label { font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--teal); margin-top: 4px; }
  .description-block, .features-block, .gallery-block { margin: 40px 0; }
  .description-block p { margin: 0 0 16px; color: #333; }
  h2 { font-size: 1.6rem; font-weight: 500; color: var(--navy); margin: 0 0 16px; border-bottom: 1px solid rgba(200,165,91,0.4); padding-bottom: 10px; }
  .features-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr; gap: 10px; }
  @media (min-width: 640px) {
    .features-list { grid-template-columns: repeat(2, 1fr); }
  }
  .features-list li { padding-left: 20px; position: relative; }
  .features-list li::before { content: "—"; position: absolute; left: 0; color: var(--gold); }
  .photo-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  @media (min-width: 640px) {
    .photo-grid { grid-template-columns: repeat(3, 1fr); }
  }
  .photo-item { display: block; border-radius: 4px; overflow: hidden; aspect-ratio: 4/3; }
  .photo-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .open-house-block {
    margin: 40px 0;
    padding: 24px;
    background: var(--navy);
    color: var(--cream);
    border-radius: 6px;
    border-left: 4px solid var(--gold);
  }
  .open-house-badge {
    display: inline-block;
    color: var(--gold);
    font-size: 0.75rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    font-weight: 500;
    margin-bottom: 12px;
  }
  .open-house-row { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-top: 1px solid rgba(248,245,239,0.15); }
  .open-house-row:first-of-type { border-top: none; }
  .cta-block {
    margin: 48px 0 16px;
    padding: 36px 24px;
    text-align: center;
    background: white;
    border-radius: 6px;
    border: 1px solid rgba(200,165,91,0.3);
  }
  .cta-block h2 { border: none; }
  .cta-buttons { display: flex; flex-wrap: wrap; gap: 14px; justify-content: center; margin-top: 20px; }
  .cta-buttons a {
    display: inline-block;
    padding: 14px 28px;
    border-radius: 4px;
    text-decoration: none;
    font-size: 0.9rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .cta-primary { background: var(--gold); color: var(--navy); }
  .cta-secondary { background: var(--navy); color: var(--cream); }
  footer {
    background: var(--navy);
    color: rgba(248,245,239,0.6);
    text-align: center;
    padding: 32px 20px;
    font-size: 0.75rem;
    line-height: 1.7;
  }
  footer .brand { color: var(--cream); font-family: 'Cormorant Garamond', serif; font-size: 1.1rem; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 10px; }
  footer .gold { color: var(--gold); }
</style>
</head>
<body>
  <div class="topbar">
    <a href="${SITE_URL}">&larr; Brenda <span class="gold">Vega</span> Realty</a>
  </div>

  <div class="hero" style="${coverUrl ? `background-image:url('${coverUrl}');` : ""}">
    <div class="hero-inner">
      <div class="status-badge">${statusLabel}</div>
      <h1>${addressSafe}</h1>
      ${citySafe ? `<p class="city">${citySafe}</p>` : ""}
      ${priceSafe ? `<p class="price">${priceSafe}</p>` : ""}
    </div>
  </div>

  <main>
    ${renderFacts(listing)}
    ${renderOpenHouses(listing)}
    ${descriptionHtml ? `<div class="description-block">${descriptionHtml}</div>` : ""}
    ${renderFeatures(listing)}
    ${renderGallery(listing)}

    <div class="cta-block">
      <h2>Tour this home with Brenda</h2>
      <p>Have questions or want to schedule a private showing? I'd love to help.</p>
      <div class="cta-buttons">
        <a class="cta-primary" href="tel:${siteConfig.agent.phoneRaw}">Call ${escapeHtml(siteConfig.agent.phone)}</a>
        <a class="cta-secondary" href="${SITE_URL}/contact">Contact Brenda</a>
      </div>
    </div>
  </main>

  <footer>
    <div class="brand">Brenda <span class="gold">Vega</span></div>
    <p>DRE License #${escapeHtml(siteConfig.agent.dre)} | ${escapeHtml(siteConfig.agent.brokerage)}</p>
    <p>We are committed to the letter and spirit of U.S. policy for the achievement of equal housing opportunity throughout the Nation.</p>
  </footer>
</body>
</html>`;
}
