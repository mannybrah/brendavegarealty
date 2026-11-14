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
  // Home Clarity (disclosure uploads). HC_ENABLED must be "true" for the form to accept uploads.
  HC_ENABLED?: string;
  HC_MAX_FILE_MB?: string;
  HC_RETENTION_DAYS?: string;
  HC_DAILY_LIMIT?: string;
  // Optional email. Without RESEND_API_KEY + HC_FROM_EMAIL, requests still reach the studio inbox.
  RESEND_API_KEY?: string;
  HC_FROM_EMAIL?: string;
  HC_REPLY_TO?: string;
  HC_NOTIFY_EMAIL?: string;
  HC_EMAIL_SINK?: string;
  SITE_URL?: string;
}
