export interface Env {
  STUDIO_PASSWORD: string;
  ANTHROPIC_API_KEY: string;
  GITHUB_DISPATCH_TOKEN: string;
  STUDIO_KV: KVNamespace;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
  CRM_DB: D1Database;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
}
