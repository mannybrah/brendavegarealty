interface RateLimitStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export async function checkRateLimit(
  store: RateLimitStore | null,
  key: string,
  maxRequests: number = 5,
  windowSeconds: number = 3600
): Promise<{ allowed: boolean; remaining: number }> {
  // Fail-open: if no KV store available, allow the request
  if (!store) {
    return { allowed: true, remaining: maxRequests };
  }

  try {
    const raw = await store.get(key);
    const count = raw ? parseInt(raw, 10) : 0;

    if (count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    await store.put(key, String(count + 1), { expirationTtl: windowSeconds });
    return { allowed: true, remaining: maxRequests - (count + 1) };
  } catch {
    // Fail-open on KV errors
    return { allowed: true, remaining: maxRequests };
  }
}
