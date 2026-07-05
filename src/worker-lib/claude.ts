import { Env } from "./env";
import { jsonResponse } from "./http";

// Returns the response's text content, or an error Response ready to return.
// `logContext` is a short endpoint label used only for structured error logs.
export async function callClaude(
  env: Env,
  body: Record<string, unknown>,
  logContext: string
): Promise<string | Response> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.log(
      JSON.stringify({ endpoint: logContext, status: "error", api: res.status, detail: detail.slice(0, 300) })
    );
    return jsonResponse({ error: `AI request failed (${res.status}) — try again` }, 502);
  }
  const data = (await res.json()) as { content: Array<{ type: string; text?: string }>; stop_reason: string };
  if (data.stop_reason === "max_tokens") {
    return jsonResponse({ error: "The AI response was cut off — try again, or trim your notes a bit" }, 502);
  }
  return data.content.find((c) => c.type === "text")?.text ?? "";
}
