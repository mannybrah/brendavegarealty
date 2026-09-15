"use client";

import { useEffect, useState } from "react";
import { CrmShell } from "@/components/studio/crm/CrmShell";
import { Card, SectionTitle } from "@/components/studio/crm/ui";

const IOS_HELP = "On iPhone, add the studio to your Home Screen first. Notifications require it.";

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

export default function CrmNotificationsPage() {
  return (
    <CrmShell title="Notifications" backHref="/studio/crm/settings" wide={false}>
      <NotificationsInner />
    </CrmShell>
  );
}

function NotificationsInner() {
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
        setErr("Notifications weren't allowed. Check your browser's site settings.");
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
      setErr("Couldn't enable notifications on this device. Try again.");
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
          setErr("Couldn't disable on the server. Try again.");
          setBusy(false);
          return;
        }
        await sub.unsubscribe();
      }
      await refreshStatus();
    } catch {
      setErr("Couldn't disable notifications. Try again.");
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
      setErr("Couldn't send a test notification. Try again.");
      return;
    }
    const j = (await r.json()) as { delivered: number; attempted: number };
    setTestMsg(
      j.delivered > 0
        ? `Delivered to ${j.delivered} device${j.delivered === 1 ? "" : "s"}.`
        : "No devices received it. Check that notifications are enabled."
    );
  }

  const statusLine =
    supported === null
      ? "Checking…"
      : !supported
        ? "Not supported in this browser."
        : permission === "denied"
          ? "Blocked. Allow notifications in your browser's site settings."
          : subscribed
            ? "Enabled on this device."
            : permission === "granted"
              ? "Permission granted, but not enabled on this device."
              : "Not enabled on this device.";

  return (
    <div className="space-y-6">
      <Card className="p-4 space-y-4">
        <SectionTitle>Push notifications</SectionTitle>

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
      </Card>
    </div>
  );
}
