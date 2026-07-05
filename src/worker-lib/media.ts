import { Env } from "./env";
import { jsonResponse } from "./http";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function handleMediaUpload(request: Request, env: Env): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse({ error: "expected multipart form" }, 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return jsonResponse({ error: "missing file" }, 400);
  if (file.size > MAX_BYTES) return jsonResponse({ error: "file too large (max 10 MB)" }, 413);
  const ext = ALLOWED[file.type];
  if (!ext) return jsonResponse({ error: `unsupported type ${file.type}` }, 415);
  const kind = form.get("kind") === "blog" ? "blog" : "feed";
  const key = `${kind}/${crypto.randomUUID()}.${ext}`;
  await env.MEDIA.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });
  return jsonResponse({ key });
}

export async function handleMediaGet(key: string, env: Env): Promise<Response> {
  const obj = await env.MEDIA.get(key);
  if (!obj) return new Response("not found", { status: 404 });
  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function deleteMediaKeys(keys: string[], env: Env): Promise<void> {
  await Promise.all(keys.map((k) => env.MEDIA.delete(k)));
}
