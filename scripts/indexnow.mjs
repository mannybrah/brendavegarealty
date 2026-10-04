// IndexNow: tell Bing (and the engines that share its feed) about new or changed URLs right away.
// Bing's index is what ChatGPT search and Copilot lean on, so this is the fast path into those answers.
// Run it AFTER the change is deployed (the URLs and the key file must be live):
//   node scripts/indexnow.mjs /services/selling-a-home /blog/how-to-choose-real-estate-agent-campbell-ca
//   node scripts/indexnow.mjs --all        (every URL in the live sitemap)
// The key file public/<KEY>.txt proves we own the host; keep it deployed.
const HOST = "brendavegarealty.com";
const KEY = "67b79fbda523c09ffed8153ec1a4ff1a";
const SITE = `https://${HOST}`;

const args = process.argv.slice(2);
let urls;
if (args.includes("--all")) {
  const xml = await (await fetch(`${SITE}/sitemap.xml`, { headers: { "User-Agent": "Mozilla/5.0 bvr-indexnow" } })).text();
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
} else {
  urls = args.map((a) => (a.startsWith("http") ? a : SITE + a));
}
if (urls.length === 0) {
  console.error("usage: node scripts/indexnow.mjs <path...> | --all");
  process.exit(1);
}
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls }),
});
console.log(`IndexNow: submitted ${urls.length} URL(s) -> HTTP ${res.status} ${res.statusText}`);
