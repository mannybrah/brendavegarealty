"use client";

import { useState } from "react";

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/studio/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      if (!r.ok) {
        setErr("Wrong password.");
        return;
      }
      onSuccess();
    } catch {
      setErr("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-6">
      <meta name="robots" content="noindex,nofollow" />
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white rounded-lg shadow-sm border border-navy/5 p-8"
      >
        <div className="text-center mb-8">
          <div className="font-display font-light text-2xl text-navy">Studio</div>
          <div className="font-body font-light text-xs text-charcoal-light mt-1 tracking-wider uppercase">
            Private
          </div>
        </div>
        <label className="block">
          <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">
            Password
          </span>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full border border-navy/10 rounded px-3 py-2 font-body text-sm focus:outline-none focus:border-teal"
          />
        </label>
        {err && (
          <div className="mt-4 text-sm text-red-600 font-body">{err}</div>
        )}
        <button
          type="submit"
          disabled={busy || !password}
          className="mt-6 w-full bg-navy text-cream font-ui font-medium text-sm tracking-wider uppercase py-3 rounded hover:bg-navy/90 transition-colors disabled:opacity-50"
        >
          {busy ? "…" : "Enter"}
        </button>
      </form>
    </div>
  );
}
