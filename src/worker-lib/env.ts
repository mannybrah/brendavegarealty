export interface Env {
  FOLLOW_UP_BOSS_API_KEY: string;
  STUDIO_PASSWORD: string;
  ANTHROPIC_API_KEY: string;
  GITHUB_DISPATCH_TOKEN: string;
  STUDIO_KV: KVNamespace;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
}
