"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StudioShell } from "@/components/studio/StudioShell";
import { CardTitle } from "@/components/studio/crm/CardTitle";

const IOS_HELP = "On iPhone, add the studio to your Home Screen first — notifications require it.";

// Standard VAPID applicationServerKey conversion — base64url string -> Uint8Array.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function deviceLabelFromUA(ua: string): string {
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Macintosh|Mac OS/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  return "Device";
}

function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export default function CrmSettingsPage() {
  return (
    <StudioShell title="Settings" backHref="/studio/crm">
      <SettingsInner />
    </StudioShell>
  );
}

function SettingsInner() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  async function refreshStatus() {
    const ok = pushSupported();
    setSupported(ok);
    if (!ok) {
      setPermission(null);
      setSubscribed(false);
      return;
    }
    setPermission(Notification.permission);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch {
      setSubscribed(false);
    }
  }

  useEffect(() => {
    refreshStatus();
  }, []);

  async function enable() {
    setErr(null);
    setBusy(true);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== "granted") {
        setErr("Notifications weren't allowed — check your browser's site settings.");
        setBusy(false);
        return;
      }

      const keyRes = await fetch("/api/studio/crm/push/vapid", { credentials: "include", cache: "no-store" });
      if (!keyRes.ok) throw new Error("vapid fetch failed");
      const { publicKey } = (await keyRes.json()) as { publicKey: string | null };
      if (!publicKey) throw new Error("no vapid key configured");

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      const deviceLabel = deviceLabelFromUA(navigator.userAgent);

      const r = await fetch("/api/studio/crm/push/subscribe", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys, deviceLabel }),
      });
      if (!r.ok) throw new Error("subscribe failed");

      await refreshStatus();
    } catch {
      setErr("Couldn't enable notifications on this device — try again.");
    }
    setBusy(false);
  }

  async function disable() {
    setErr(null);
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        let r: Response | null;
        try {
          r = await fetch("/api/studio/crm/push/subscribe", {
            method: "DELETE",
            credentials: "include",
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
        } catch {
          r = null;
        }
        if (!r || !r.ok) {
          setErr("Couldn't disable on the server — try again.");
          setBusy(false);
          return;
        }
        await sub.unsubscribe();
      }
      await refreshStatus();
    } catch {
      setErr("Couldn't disable notifications — try again.");
    }
    setBusy(false);
  }

  async function sendTest() {
    setErr(null);
    setTestMsg(null);
    setBusy(true);
    let r: Response | null;
    try {
      r = await fetch("/api/studio/crm/push/test", { method: "POST", credentials: "include", cache: "no-store" });
    } catch {
      r = null;
    }
    setBusy(false);
    if (!r || !r.ok) {
      setErr("Couldn't send a test notification — try again.");
      return;
    }
    const j = (await r.json()) as { delivered: number; attempted: number };
    setTestMsg(
      j.delivered > 0
        ? `Delivered to ${j.delivered} device${j.delivered === 1 ? "" : "s"}.`
        : "No devices received it — check that notifications are enabled."
    );
  }

  const statusLine =
    supported === null
      ? "Checking…"
      : !supported
        ? "Not supported in this browser."
        : permission === "denied"
          ? "Blocked — allow notifications in your browser's site settings."
          : subscribed
            ? "Enabled on this device."
            : permission === "granted"
              ? "Permission granted, but not enabled on this device."
              : "Not enabled on this device.";

  return (
    <div className="space-y-6">
      <section className="bg-[#FCFBF7] rounded-lg border border-navy/10 shadow-[0_1px_3px_rgba(15,29,53,0.06)] p-4 space-y-4">
        <CardTitle>Notifications</CardTitle>

        {err && <div className="font-body text-sm text-red-600">{err}</div>}

        <div className="font-body text-sm text-navy">{statusLine}</div>

        {supported && (
          <div className="flex gap-3">
            {!subscribed ? (
              <button
                onClick={enable}
                disabled={busy}
                className="flex-1 bg-navy text-gold hover:bg-navy/90 font-ui font-medium text-sm tracking-wider uppercase py-3.5 rounded-md active:scale-[0.98] transition-transform disabled:opacity-60"
              >
                {busy ? "Enabling…" : "Enable on this device"}
              </button>
            ) : (
              <button
                onClick={disable}
                disabled={busy}
                className="flex-1 bg-white border border-navy/20 text-navy font-ui text-xs tracking-wider uppercase py-3.5 rounded-md disabled:opacity-60"
              >
                {busy ? "Disabling…" : "Disable on this device"}
              </button>
            )}
          </div>
        )}

        {subscribed && (
          <button
            onClick={sendTest}
            disabled={busy}
            className="w-full bg-navy text-gold hover:bg-navy/90 font-ui text-xs tracking-wider uppercase py-3 rounded-md active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            Send test notification
          </button>
        )}

        {testMsg && <div className="font-body text-xs text-teal">{testMsg}</div>}

        <p className="font-body font-light text-xs text-charcoal-light">{IOS_HELP}</p>
      </section>

      <Link
        href="/studio/crm/import"
        className="flex items-center justify-between bg-[#FCFBF7] rounded-lg border border-navy/10 shadow-[0_1px_3px_rgba(15,29,53,0.06)] p-4"
      >
        <span className="font-body text-sm text-navy">Import contacts from CSV</span>
        <span className="text-charcoal-light">&rarr;</span>
      </Link>
    </div>
  );
}
