#!/usr/bin/env node
/**
 * Adds the DNS records Google Workspace needs for brendavegarealty.com
 * to Cloudflare. Idempotent: existing identical records are left alone.
 *
 * Needs a Cloudflare API token with Zone > DNS > Edit on this zone:
 *   CLOUDFLARE_DNS_TOKEN=cfat_xxx node scripts/setup-google-mail-dns.mjs \
 *     [--verify=google-site-verification=XXXX] \
 *     [--dkim="v=DKIM1; k=rsa; p=MIIB..."] \
 *     [--dry-run]
 *
 * Always ensures:   MX @ -> smtp.google.com (prio 1)
 *                   TXT @ -> v=spf1 include:_spf.google.com ~all
 *                   TXT _dmarc -> v=DMARC1; p=none; rua=mailto:brenda@brendavegarealty.com
 * With --verify:    TXT @ -> google-site-verification=...   (from Workspace signup)
 * With --dkim:      TXT google._domainkey -> ...            (from Admin console)
 */
const ZONE = "brendavegarealty.com";
const MAILBOX = "brenda@brendavegarealty.com";
const token = process.env.CLOUDFLARE_DNS_TOKEN;
if (!token) { console.error("Set CLOUDFLARE_DNS_TOKEN (Zone DNS Edit token)."); process.exit(1); }

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const dry = !!args["dry-run"];

const api = async (path, init = {}) => {
  const r = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const j = await r.json();
  if (!j.success) throw new Error(`${path}: ${JSON.stringify(j.errors)}`);
  return j.result;
};

const zones = await api(`/zones?name=${ZONE}`);
if (!zones.length) throw new Error(`Zone ${ZONE} not visible to this token`);
const zoneId = zones[0].id;
const existing = await api(`/zones/${zoneId}/dns_records?per_page=500`);

const wanted = [
  { type: "MX", name: ZONE, content: "smtp.google.com", priority: 1, ttl: 1 },
  { type: "TXT", name: ZONE, content: "v=spf1 include:_spf.google.com ~all", ttl: 1 },
  { type: "TXT", name: `_dmarc.${ZONE}`, content: `v=DMARC1; p=none; rua=mailto:${MAILBOX}`, ttl: 1 },
];
if (typeof args.verify === "string") wanted.push({ type: "TXT", name: ZONE, content: args.verify, ttl: 1 });
if (typeof args.dkim === "string") wanted.push({ type: "TXT", name: `google._domainkey.${ZONE}`, content: args.dkim, ttl: 1 });

const norm = s => String(s).replace(/^"|"$/g, "").trim();
for (const rec of wanted) {
  const dup = existing.find(e => e.type === rec.type && e.name === rec.name && norm(e.content) === norm(rec.content));
  if (dup) { console.log(`= exists  ${rec.type} ${rec.name} -> ${rec.content}`); continue; }
  // Old MX records pointing elsewhere would break delivery; report them.
  if (rec.type === "MX") {
    for (const e of existing.filter(e => e.type === "MX" && e.name === rec.name))
      console.log(`! other MX present: ${e.content} (prio ${e.priority}) — remove it in the dashboard if not Google`);
  }
  if (rec.type === "TXT" && rec.content.startsWith("v=spf1")) {
    for (const e of existing.filter(e => e.type === "TXT" && e.name === rec.name && norm(e.content).startsWith("v=spf1")))
      console.log(`! other SPF present: ${e.content} — a domain must have exactly one SPF; merge manually`);
  }
  if (dry) { console.log(`+ would add ${rec.type} ${rec.name} -> ${rec.content}`); continue; }
  await api(`/zones/${zoneId}/dns_records`, { method: "POST", body: JSON.stringify({ ...rec, proxied: false }) });
  console.log(`+ added   ${rec.type} ${rec.name} -> ${rec.content}`);
}
console.log(dry ? "Dry run complete." : "Done. Records propagate in a few minutes on Cloudflare.");
