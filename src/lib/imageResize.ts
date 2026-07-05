"use client";

export async function resizeImage(file: File, maxDim = 1600): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Couldn't read that photo — try choosing a different one.");
  }
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.85)
  );
}

export async function uploadImage(file: File, kind: "feed" | "blog"): Promise<string> {
  const blob = await resizeImage(file);
  const form = new FormData();
  form.append("file", new File([blob], "photo.jpg", { type: "image/jpeg" }));
  form.append("kind", kind);
  const r = await fetch("/api/studio/upload", { method: "POST", credentials: "include", body: form });
  if (!r.ok) throw new Error((await r.json().catch(() => ({})) as { error?: string }).error ?? "upload failed");
  const j = (await r.json()) as { key: string };
  return j.key;
}
