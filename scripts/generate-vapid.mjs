// Generates a VAPID (Voluntary Application Server Identification) keypair for
// Web Push, in the exact base64url string format expected by
// @block65/webcrypto-web-push's `VapidKeys` config (see its dist/lib/vapid.js):
//   publicKey  = base64url(raw uncompressed P-256 point: 0x04 || X(32) || Y(32))
//   privateKey = base64url(JWK `d` scalar) -- already base64url per RFC 7518
//
// Run once, then paste the printed values into .dev.vars for local dev and
// into `wrangler secret put` for production. Never commit real keys.
import { webcrypto } from "node:crypto";

const { subtle } = webcrypto;

const keyPair = await subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"]
);

const rawPublic = new Uint8Array(await subtle.exportKey("raw", keyPair.publicKey));
const publicKey = Buffer.from(rawPublic).toString("base64url");

const privateJwk = await subtle.exportKey("jwk", keyPair.privateKey);
const privateKey = privateJwk.d;

console.log("VAPID_PUBLIC_KEY=" + publicKey);
console.log("VAPID_PRIVATE_KEY=" + privateKey);
