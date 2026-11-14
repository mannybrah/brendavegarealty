"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { StudioShell } from "@/components/studio/StudioShell";
import {
  CONTACT_STATUS_LABELS,
  CONTACT_STATUSES,
  INBOX_FILTERS,
  REPORT_STATUS_LABELS,
  REPORT_STATUSES,
  agentStatusLabel,
  formatBytes,
  type InboxFilter,
} from "@/lib/homeClarity";

interface Item {
  id: string;
  propertyAddress: string;
  fullName: string;
  email: string;
  phone: string | null;
  preferredContact: string;
  agentStatus: string | null;
  reportStatus: keyof typeof REPORT_STATUS_LABELS;
  contactStatus: keyof typeof CONTACT_STATUS_LABELS;
  reviewedAt: string | null;
  receivedAt: string | null;
  bucket: string;
}

interface Detail extends Item {
  questions: string | null;
  consentVersion: string;
  consentAt: string;
  sourcePage: string | null;
  utm: Record<string, string> | null;
  fileName: string | null;
  fileBytes: number | null;
  fileAvailable: boolean;
  fileDeletedAt: string | null;
  reportUrl: string | null;
  crmContactId: string | null;
}

interface Note {
  id: string;
  body: string;
  created_at: string;
}

interface Delivery {
  kind: string;
  status: string;
  attempts: number;
  last_error: string | null;
  sent_at: string | null;
}

const card = "bg-[#FCFBF7] rounded-lg border border-navy/10 shadow-[0_1px_3px_rgba(15,29,53,0.06)]";
const label = "font-ui text-[0.65rem] tracking-wider uppercase text-charcoal-light";
const select =
  "w-full h-11 px-3 bg-white border border-navy/20 rounded-md font-body text-sm text-navy focus:border-teal focus:outline-none";

function when(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", cache: "no-store", ...init });
  if (res.status === 401) {
    window.location.reload();
    throw new Error("unauthorized");
  }
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error || "Something went wrong");
  return body;
}

export default function HomeClarityInboxPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const id = useSearchParams().get("id");
  return (
    <StudioShell title={id ? "Home Clarity request" : "Home Clarity"} backHref={id ? "/studio/home-clarity" : "/studio"}>
      {id ? <DetailView id={id} /> : <ListView />}
    </StudioShell>
  );
}

function ListView() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [meta, setMeta] = useState<{ enabled: boolean; retentionDays: number } | null>(null);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ items: Item[]; counts: Record<string, number>; enabled: boolean; retentionDays: number }>("/api/studio/home-clarity")
      .then((j) => {
        setItems(j.items);
        setCounts(j.counts);
        setMeta({ enabled: j.enabled, retentionDays: j.retentionDays });
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const shown = (items ?? []).filter((i) => filter === "all" || i.bucket === filter);

  return (
    <>
      {meta && !meta.enabled && (
        <p className="mb-4 rounded-md bg-gold/15 border border-gold/40 px-4 py-3 font-body text-sm text-navy">
          Uploads are currently paused on the website. Existing requests are still here.
        </p>
      )}
      <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-3">
        {INBOX_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            aria-pressed={filter === f.value}
            className={`shrink-0 h-9 px-4 rounded-full font-ui text-xs tracking-wide transition-colors ${
              filter === f.value ? "bg-navy text-cream" : "bg-white border border-navy/15 text-navy"
            }`}
          >
            {f.label} {counts[f.value] ? <span className="opacity-70">{counts[f.value]}</span> : null}
          </button>
        ))}
      </div>

      {error && <p className="font-body text-sm text-red-700 mt-4">{error}</p>}
      {items === null && !error && <p className="font-body text-sm text-charcoal-light mt-6">Loading…</p>}
      {items !== null && shown.length === 0 && (
        <div className={`${card} p-6 mt-2 text-center`}>
          <p className="font-display text-lg text-navy">{items.length === 0 ? "No requests yet" : "Nothing in this view"}</p>
          <p className="font-body font-light text-sm text-charcoal-light mt-1">
            {items.length === 0
              ? "When a buyer uploads disclosures on the website, the request shows up here."
              : "Try another filter."}
          </p>
        </div>
      )}

      <div className={`${shown.length ? card : ""} divide-y divide-navy/5 mt-2`}>
        {shown.map((item) => (
          <Link key={item.id} href={`/studio/home-clarity?id=${item.id}`} className="block p-4 active:bg-navy/5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-body font-medium text-sm text-navy truncate">{item.fullName}</div>
                <div className="font-body font-light text-sm text-charcoal-light truncate">{item.propertyAddress}</div>
              </div>
              <div className={`${label} shrink-0 pt-0.5`}>{when(item.receivedAt)}</div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <span className="font-ui text-[0.65rem] px-2 py-1 rounded-full bg-navy/5 text-navy">
                Report: {REPORT_STATUS_LABELS[item.reportStatus]}
              </span>
              <span className="font-ui text-[0.65rem] px-2 py-1 rounded-full bg-teal/10 text-teal">
                {CONTACT_STATUS_LABELS[item.contactStatus]}
              </span>
              {item.agentStatus === "represented" && (
                <span className="font-ui text-[0.65rem] px-2 py-1 rounded-full bg-gold/20 text-[#6B4E12]">Has an agent</span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {meta && (
        <p className="font-body font-light text-xs text-charcoal-light mt-6 leading-relaxed">
          Uploaded PDFs are deleted automatically {meta.retentionDays} days after they arrive. The request details
          stay here.
        </p>
      )}
    </>
  );
}

function DetailView({ id }: { id: string }) {
  const [data, setData] = useState<{ intake: Detail; notes: Note[]; deliveries: Delivery[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [reportUrl, setReportUrl] = useState("");

  const apply = useCallback((j: { intake: Detail; notes: Note[]; deliveries: Delivery[] }) => {
    setData(j);
    setReportUrl(j.intake.reportUrl ?? "");
    setError(null);
  }, []);

  useEffect(() => {
    api<{ intake: Detail; notes: Note[]; deliveries: Delivery[] }>(`/api/studio/home-clarity/${id}`)
      .then(apply)
      .catch((e: Error) => setError(e.message));
  }, [id, apply]);

  async function run(path: string, init: RequestInit) {
    setSaving(true);
    try {
      apply(await api(path, init));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const patch = (body: Record<string, unknown>) =>
    run(`/api/studio/home-clarity/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  if (error && !data) return <p className="font-body text-sm text-red-700">{error}</p>;
  if (!data) return <p className="font-body text-sm text-charcoal-light">Loading…</p>;
  const { intake, notes, deliveries } = data;

  return (
    <div className="space-y-4">
      {error && <p className="rounded-md bg-red-50 border border-red-200 px-4 py-3 font-body text-sm text-red-800">{error}</p>}

      <section className={`${card} p-5`}>
        <div className={label}>Property</div>
        <h2 className="font-display text-xl text-navy leading-snug mt-1 break-words">{intake.propertyAddress}</h2>
        <div className={`${label} mt-1`}>Received {when(intake.receivedAt)}</div>

        <dl className="mt-5 space-y-3 font-body text-sm">
          <div>
            <dt className={label}>Buyer</dt>
            <dd className="text-navy">{intake.fullName}</dd>
          </div>
          <div>
            <dt className={label}>Email{intake.preferredContact === "email" ? " · preferred" : ""}</dt>
            <dd>
              <a href={`mailto:${intake.email}`} className="text-teal underline underline-offset-2 break-all">
                {intake.email}
              </a>
            </dd>
          </div>
          <div>
            <dt className={label}>Phone{intake.preferredContact === "phone" ? " · preferred" : ""}</dt>
            <dd>
              {intake.phone ? (
                <a href={`tel:${intake.phone}`} className="text-teal underline underline-offset-2">
                  {intake.phone}
                </a>
              ) : (
                <span className="text-charcoal-light">Not provided</span>
              )}
            </dd>
          </div>
          <div>
            <dt className={label}>Working with an agent?</dt>
            <dd className={intake.agentStatus === "represented" ? "text-[#6B4E12] font-medium" : "text-navy"}>
              {agentStatusLabel(intake.agentStatus)}
            </dd>
          </div>
          {intake.questions && (
            <div>
              <dt className={label}>Their questions</dt>
              <dd className="text-navy whitespace-pre-line break-words">{intake.questions}</dd>
            </div>
          )}
        </dl>
        {intake.crmContactId && (
          <Link
            href={`/studio/crm/contact?id=${intake.crmContactId}`}
            className="inline-block mt-5 font-ui text-xs tracking-wider uppercase text-teal"
          >
            Open in Clients &rarr;
          </Link>
        )}
      </section>

      <section className={`${card} p-5`}>
        <div className={label}>Disclosure PDF</div>
        {intake.fileAvailable ? (
          <>
            <p className="font-body text-sm text-navy mt-1 break-all">
              {intake.fileName} <span className="text-charcoal-light">({formatBytes(intake.fileBytes)})</span>
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <a
                href={`/api/studio/home-clarity/${id}/file`}
                className="inline-flex items-center justify-center h-11 px-5 rounded-md bg-navy text-cream font-ui text-xs tracking-wider uppercase"
              >
                Download PDF
              </a>
              <button
                disabled={saving}
                onClick={() => {
                  if (window.confirm("Delete the uploaded PDF? The request details stay, but the file cannot be recovered.")) {
                    run(`/api/studio/home-clarity/${id}/file`, { method: "DELETE" });
                  }
                }}
                className="inline-flex items-center justify-center h-11 px-5 rounded-md border border-navy/20 text-navy font-ui text-xs tracking-wider uppercase"
              >
                Delete file
              </button>
            </div>
            <p className="font-body font-light text-xs text-charcoal-light mt-3 leading-relaxed">
              Download it, run it through BuyerBrief, then record the report below.
            </p>
          </>
        ) : (
          <p className="font-body text-sm text-charcoal-light mt-1">
            File deleted{intake.fileDeletedAt ? ` ${when(intake.fileDeletedAt)}` : ""}.
          </p>
        )}
      </section>

      <section className={`${card} p-5 space-y-4`}>
        <div>
          <label htmlFor="hc-report" className={label}>
            Report
          </label>
          <select
            id="hc-report"
            value={intake.reportStatus}
            disabled={saving}
            onChange={(e) => patch({ reportStatus: e.target.value })}
            className={`${select} mt-1`}
          >
            {REPORT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {REPORT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="hc-url" className={label}>
            Report link (optional)
          </label>
          <div className="flex gap-2 mt-1">
            <input
              id="hc-url"
              type="url"
              inputMode="url"
              value={reportUrl}
              onChange={(e) => setReportUrl(e.target.value)}
              placeholder="https://"
              className={`${select} min-w-0`}
            />
            <button
              disabled={saving || reportUrl === (intake.reportUrl ?? "")}
              onClick={() => patch({ reportUrl })}
              className="shrink-0 h-11 px-4 rounded-md bg-teal text-white font-ui text-xs tracking-wider uppercase disabled:opacity-40"
            >
              Save
            </button>
          </div>
          {intake.reportUrl && (
            <a
              href={intake.reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 font-ui text-xs tracking-wider uppercase text-teal"
            >
              Open report &rarr;
            </a>
          )}
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!intake.reviewedAt}
            disabled={saving}
            onChange={(e) => patch({ reviewed: e.target.checked })}
            className="mt-0.5 w-5 h-5 accent-[#2A7F6F]"
          />
          <span className="font-body text-sm text-navy">
            I have personally reviewed this report
            {intake.reviewedAt && <span className="block text-xs text-charcoal-light">Marked {when(intake.reviewedAt)}</span>}
          </span>
        </label>
      </section>

      <section className={`${card} p-5`}>
        <label htmlFor="hc-contact" className={label}>
          My follow-up with the buyer
        </label>
        <select
          id="hc-contact"
          value={intake.contactStatus}
          disabled={saving}
          onChange={(e) => patch({ contactStatus: e.target.value })}
          className={`${select} mt-1`}
        >
          {CONTACT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CONTACT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </section>

      <section className={`${card} p-5`}>
        <label htmlFor="hc-note" className={label}>
          Notes
        </label>
        <textarea
          id="hc-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder="Called and left a voicemail…"
          className="w-full mt-1 px-3 py-2 bg-white border border-navy/20 rounded-md font-body text-sm text-navy focus:border-teal focus:outline-none"
        />
        <button
          disabled={saving || !note.trim()}
          onClick={async () => {
            await run(`/api/studio/home-clarity/${id}/notes`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ body: note }),
            });
            setNote("");
          }}
          className="mt-2 h-11 px-5 rounded-md bg-navy text-cream font-ui text-xs tracking-wider uppercase disabled:opacity-40"
        >
          Add note
        </button>
        {notes.length > 0 && (
          <ul className="list-none p-0 m-0 mt-4 divide-y divide-navy/5">
            {notes.map((n) => (
              <li key={n.id} className="py-3">
                <div className={label}>{when(n.created_at)}</div>
                <p className="font-body text-sm text-navy whitespace-pre-line break-words mt-0.5">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${card} p-5`}>
        <div className={label}>Record</div>
        <dl className="mt-2 space-y-1 font-body font-light text-xs text-charcoal-light">
          <div>
            Consent notice {intake.consentVersion}, agreed {when(intake.consentAt)}
          </div>
          {intake.sourcePage && <div>Submitted from {intake.sourcePage}</div>}
          {intake.utm && <div>Campaign: {Object.entries(intake.utm).map(([k, v]) => `${k}=${v}`).join(", ")}</div>}
          {deliveries.map((d) => (
            <div key={d.kind}>
              {d.kind === "buyer_receipt" ? "Buyer confirmation email" : "Email to you"}:{" "}
              {d.status === "sent" ? `sent ${when(d.sent_at)}` : d.status === "skipped" ? `not sent (${d.last_error})` : d.status}
            </div>
          ))}
        </dl>
        {deliveries.some((d) => d.status === "failed" || d.status === "skipped") && (
          <button
            disabled={saving}
            onClick={() => run(`/api/studio/home-clarity/${id}/resend`, { method: "POST" })}
            className="mt-3 font-ui text-xs tracking-wider uppercase text-teal"
          >
            Try sending emails again
          </button>
        )}
      </section>
    </div>
  );
}
