"use client";

import { useMemo, useState } from "react";
import { StudioShell } from "@/components/studio/StudioShell";
import { parseCsv, autoMapColumns, rowsToImportContacts, type ImportField, type ImportContact } from "@/lib/crm/csv";

const CHUNK_SIZE = 200;

const FIELD_ORDER: ImportField[] = [
  "firstName",
  "lastName",
  "name",
  "email",
  "phone",
  "stage",
  "source",
  "tags",
  "notes",
  "createdAt",
];

const FIELD_LABELS: Record<ImportField, string> = {
  firstName: "First name",
  lastName: "Last name",
  name: "Full name",
  email: "Email",
  phone: "Phone",
  stage: "Stage",
  source: "Source",
  tags: "Tags",
  notes: "Notes",
  createdAt: "Created date",
};

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

type ChunkStatus = "pending" | "ok" | "error";

interface Totals {
  created: number;
  merged: number;
  skipped: number;
}

export default function CrmImportPage() {
  return (
    <StudioShell title="Import contacts" backHref="/studio/crm">
      <ImportInner />
    </StudioShell>
  );
}

function ImportInner() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [map, setMap] = useState<Record<string, number>>({});
  const [err, setErr] = useState<string | null>(null);

  const [chunks, setChunks] = useState<ImportContact[][]>([]);
  const [chunkStatus, setChunkStatus] = useState<ChunkStatus[]>([]);
  const [totals, setTotals] = useState<Totals>({ created: 0, merged: 0, skipped: 0 });
  const [importing, setImporting] = useState(false);
  const [progressDone, setProgressDone] = useState(0);

  const mappedContacts = useMemo(() => rowsToImportContacts(dataRows, map), [dataRows, map]);
  const hasFile = headers.length > 0;
  const started = chunks.length > 0;
  const failedCount = chunkStatus.filter((s) => s === "error").length;
  const doneImporting = started && !importing && chunkStatus.every((s) => s !== "pending");

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const rows = parseCsv(text);
      if (rows.length < 2) {
        setErr("That file doesn't look like a CSV with a header row and data.");
        return;
      }
      const [header, ...data] = rows;
      setHeaders(header);
      setDataRows(data);
      setMap(autoMapColumns(header));
      setFileName(file.name);
      setChunks([]);
      setChunkStatus([]);
      setTotals({ created: 0, merged: 0, skipped: 0 });
      setProgressDone(0);
    };
    reader.onerror = () => setErr("Couldn't read that file — try again.");
    reader.readAsText(file);
    // Allow re-selecting the same file later.
    e.target.value = "";
  }

  function setFieldColumn(field: ImportField, value: string) {
    setMap((prev) => {
      const next = { ...prev };
      if (value === "") delete next[field];
      else next[field] = Number(value);
      return next;
    });
  }

  async function postChunk(rows: ImportContact[]): Promise<Totals | null> {
    let r: Response | null;
    try {
      r = await fetch("/api/studio/crm/import", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: rows }),
      });
    } catch {
      r = null;
    }
    if (!r || !r.ok) return null;
    return (await r.json()) as Totals;
  }

  async function runChunks(jobs: { index: number; rows: ImportContact[] }[]) {
    setImporting(true);
    for (const job of jobs) {
      const result = await postChunk(job.rows);
      if (result) {
        setTotals((t) => ({
          created: t.created + result.created,
          merged: t.merged + result.merged,
          skipped: t.skipped + result.skipped,
        }));
        setChunkStatus((cs) => {
          const next = [...cs];
          next[job.index] = "ok";
          return next;
        });
      } else {
        setChunkStatus((cs) => {
          const next = [...cs];
          next[job.index] = "error";
          return next;
        });
      }
      setProgressDone((d) => d + 1);
    }
    setImporting(false);
  }

  async function startImport() {
    if (mappedContacts.length === 0) return;
    setErr(null);
    const all = chunkArray(mappedContacts, CHUNK_SIZE);
    setChunks(all);
    setChunkStatus(all.map(() => "pending"));
    setTotals({ created: 0, merged: 0, skipped: 0 });
    setProgressDone(0);
    await runChunks(all.map((rows, index) => ({ index, rows })));
  }

  async function retryFailed() {
    const failedIdx = chunkStatus.map((s, i) => (s === "error" ? i : -1)).filter((i) => i >= 0);
    if (failedIdx.length === 0) return;
    setChunkStatus((cs) => {
      const next = [...cs];
      failedIdx.forEach((i) => (next[i] = "pending"));
      return next;
    });
    setProgressDone((d) => d - failedIdx.length);
    await runChunks(failedIdx.map((index) => ({ index, rows: chunks[index] })));
  }

  const progressTotal = chunks.length;
  const progressPct = progressTotal > 0 ? Math.round((progressDone / progressTotal) * 100) : 0;

  const field =
    "bg-white border border-navy/10 rounded-lg px-2 py-1.5 font-body text-xs focus:outline-none focus:border-teal";

  return (
    <div className="space-y-6">
      <p className="font-body text-sm text-charcoal-light">
        Upload a CSV export from another CRM or spreadsheet. Map the columns below, then import.
      </p>

      {err && <div className="font-body text-sm text-red-600">{err}</div>}

      <section className="bg-white rounded-2xl border border-navy/5 p-4 space-y-3">
        <h2 className="font-ui text-xs tracking-wider uppercase text-charcoal-light">1. Choose a file</h2>
        <input
          type="file"
          accept=".csv"
          onChange={onFileChange}
          className="w-full font-body text-sm text-navy file:mr-3 file:bg-navy file:text-cream file:font-ui file:text-xs file:tracking-wider file:uppercase file:px-4 file:py-2.5 file:rounded-xl file:border-0"
        />
        {fileName && (
          <div className="font-body text-xs text-charcoal-light">
            {fileName} · {dataRows.length} row{dataRows.length === 1 ? "" : "s"}
          </div>
        )}
      </section>

      {hasFile && (
        <section className="bg-white rounded-2xl border border-navy/5 p-4 space-y-3">
          <h2 className="font-ui text-xs tracking-wider uppercase text-charcoal-light">2. Map columns</h2>
          <div className="space-y-2">
            {FIELD_ORDER.map((f) => (
              <div key={f} className="flex items-center justify-between gap-3">
                <span className="font-body text-sm text-navy shrink-0">{FIELD_LABELS[f]}</span>
                <select value={map[f] ?? ""} onChange={(e) => setFieldColumn(f, e.target.value)} className={`${field} flex-1 min-w-0`}>
                  <option value="">— not mapped —</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      )}

      {hasFile && (
        <section className="bg-white rounded-2xl border border-navy/5 p-4 space-y-3">
          <h2 className="font-ui text-xs tracking-wider uppercase text-charcoal-light">
            3. Preview ({mappedContacts.length} contact{mappedContacts.length === 1 ? "" : "s"} will import)
          </h2>
          {mappedContacts.length === 0 ? (
            <div className="font-body text-sm text-charcoal-light">
              No rows matched — map at least a name, email, or phone column above.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="font-ui text-[0.6rem] tracking-wider uppercase text-charcoal-light">
                    <th className="pb-2 pr-3">Name</th>
                    <th className="pb-2 pr-3">Email</th>
                    <th className="pb-2 pr-3">Phone</th>
                    <th className="pb-2">Stage</th>
                  </tr>
                </thead>
                <tbody className="font-body text-xs text-navy">
                  {mappedContacts.slice(0, 5).map((c, i) => (
                    <tr key={i} className="border-t border-navy/5">
                      <td className="py-2 pr-3 whitespace-nowrap">{`${c.firstName} ${c.lastName}`.trim() || "—"}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{c.email ?? "—"}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{c.phone ?? "—"}</td>
                      <td className="py-2 whitespace-nowrap">{c.stage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={startImport}
            disabled={mappedContacts.length === 0 || importing}
            className="w-full bg-teal text-white font-ui font-medium text-sm tracking-wider uppercase py-3.5 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {importing ? "Importing…" : `Import ${mappedContacts.length} contact${mappedContacts.length === 1 ? "" : "s"}`}
          </button>
        </section>
      )}

      {started && (
        <section className="bg-white rounded-2xl border border-navy/5 p-4 space-y-3">
          <div className="h-2 bg-navy/5 rounded-full overflow-hidden">
            <div className="h-full bg-teal transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="font-ui text-[0.65rem] tracking-wider uppercase text-charcoal-light">
            {progressDone}/{progressTotal} batches
          </div>

          {doneImporting && (
            <div className="space-y-2">
              <div className="font-body text-sm text-navy">
                {totals.created} added · {totals.merged} merged · {totals.skipped} skipped
              </div>
              {failedCount > 0 && (
                <>
                  <div className="font-body text-sm text-red-600">
                    {failedCount} batch{failedCount === 1 ? "" : "es"} failed — nothing in {failedCount === 1 ? "it" : "them"} was
                    imported yet.
                  </div>
                  <button
                    onClick={retryFailed}
                    className="w-full bg-navy text-cream font-ui text-xs tracking-wider uppercase py-3 rounded-xl active:scale-[0.98] transition-transform"
                  >
                    Retry failed batches
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
