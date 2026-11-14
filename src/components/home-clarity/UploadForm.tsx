"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  AGENT_STATUS_OPTIONS,
  AGENT_STATUS_QUESTION,
  HC_CONSENT_NOTICE,
  HC_DEFAULT_MAX_MB,
  formatBytes,
  validateIntake,
  type IntakeErrors,
} from "@/lib/homeClarity";
import { siteConfig } from "@/data/site";

type Phase = "form" | "saving" | "uploading" | "received";

const SERVER_MESSAGES: Record<string, string> = {
  unavailable: "Uploads are paused right now. Please call or email Brenda and she will help you directly.",
  rate_limited: "We have received several requests from you already. Please try again later, or contact Brenda directly.",
  too_large: "That file is too large to upload.",
  empty_file: "That file is empty. Choose another PDF.",
  not_pdf: "That file is not a readable PDF. Export or save the disclosures as a PDF and try again.",
  expired: "This upload session expired. Refresh the page and submit again.",
  unauthorized: "This upload session is no longer valid. Refresh the page and submit again.",
  upload_failed: "The upload did not go through. Check your connection and try again.",
};

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

const inputClass =
  "w-full h-12 px-4 bg-white border border-navy/25 font-body text-base text-charcoal placeholder:text-charcoal-light/60 focus:border-navy focus:outline-none focus-visible:outline-2 focus-visible:outline-gold";
const labelClass = "block font-body font-medium text-sm text-navy mb-2";
const errorClass = "mt-2 font-body text-sm text-[#A12C1B]";

export function UploadForm() {
  const uid = useId();
  const [phase, setPhase] = useState<Phase>("form");
  const [maxMb, setMaxMb] = useState(HC_DEFAULT_MAX_MB);
  const [open, setOpen] = useState<boolean | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [preferredContact, setPreferredContact] = useState<"email" | "phone">("email");
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<IntakeErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [receivedAddress, setReceivedAddress] = useState("");

  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  // One key per attempt at this form: a double click or a retry reuses the same request
  const keyRef = useRef<string>("");
  const sessionRef = useRef<{ id: string; token: string } | null>(null);

  useEffect(() => {
    keyRef.current = newKey();
    fetch("/api/home-clarity/config", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { enabled?: boolean; maxMb?: number } | null) => {
        setOpen(j ? j.enabled === true : false);
        if (j?.maxMb) setMaxMb(j.maxMb);
      })
      .catch(() => setOpen(false));
  }, []);

  useEffect(() => {
    if (phase === "received") doneRef.current?.focus();
  }, [phase]);

  function chooseFile(next: File | null) {
    setFile(next);
    setServerError(null);
    setErrors((e) => ({ ...e, file: undefined }));
    // A different file is a different request
    sessionRef.current = null;
    keyRef.current = newKey();
  }

  function failWith(message: string) {
    setServerError(message);
    setPhase("form");
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  function uploadFile(id: string, token: string, pdf: File): Promise<{ status: number; body: Record<string, unknown> }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", `/api/home-clarity/intakes/${id}/file`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("Content-Type", "application/pdf");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
      };
      xhr.onload = () => {
        let body: Record<string, unknown> = {};
        try {
          body = JSON.parse(xhr.responseText) as Record<string, unknown>;
        } catch {
          // non-JSON error page
        }
        resolve({ status: xhr.status, body });
      };
      xhr.onerror = () => reject(new Error("network"));
      xhr.ontimeout = () => reject(new Error("network"));
      xhr.send(pdf);
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phase !== "form") return;
    setServerError(null);

    const data = new FormData(e.currentTarget);
    const payload = {
      propertyAddress: String(data.get("propertyAddress") ?? ""),
      fullName: String(data.get("fullName") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      preferredContact,
      agentStatus,
      questions: String(data.get("questions") ?? ""),
      website: String(data.get("website") ?? ""),
      fileName: file?.name ?? "",
      fileBytes: file?.size ?? 0,
      consent,
      idempotencyKey: keyRef.current,
      sourcePage: window.location.pathname,
      utm: Object.fromEntries(new URLSearchParams(window.location.search)),
    };

    const check = validateIntake(payload, maxMb);
    if (!check.ok) {
      setErrors(check.errors);
      const order: (keyof IntakeErrors)[] = ["propertyAddress", "file", "fullName", "email", "phone", "preferredContact", "consent"];
      const first = order.find((k) => check.errors[k]);
      const target = first === "file" ? fileRef.current : formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`);
      target?.focus();
      return;
    }
    setErrors({});
    if (!file) return;

    try {
      // Step 1: save the request details (skipped when retrying the same upload)
      let session = sessionRef.current;
      if (!session) {
        setPhase("saving");
        const res = await fetch("/api/home-clarity/intakes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = (await res.json().catch(() => ({}))) as {
          id?: string;
          uploadToken?: string;
          state?: string;
          error?: string;
          fields?: IntakeErrors;
        };
        if (!res.ok || !body.id || !body.uploadToken) {
          if (body.fields) setErrors(body.fields);
          return failWith(SERVER_MESSAGES[body.error ?? ""] ?? "Something went wrong on our side. Please try again in a moment.");
        }
        session = { id: body.id, token: body.uploadToken };
        sessionRef.current = session;
        if (body.state === "received") {
          setReceivedAddress(check.value.propertyAddress);
          return setPhase("received");
        }
      }

      // Step 2: send the PDF. Success is only shown once the server confirms it is stored.
      setProgress(0);
      setPhase("uploading");
      const result = await uploadFile(session.id, session.token, file);
      if (result.status === 200 && result.body.state === "received") {
        setProgress(100);
        setReceivedAddress(check.value.propertyAddress);
        return setPhase("received");
      }
      const code = String(result.body.error ?? (result.status === 413 ? "too_large" : "upload_failed"));
      if (code === "expired" || code === "unauthorized") {
        sessionRef.current = null;
        keyRef.current = newKey();
      }
      failWith(SERVER_MESSAGES[code] ?? SERVER_MESSAGES.upload_failed);
    } catch {
      // Network drop mid-transfer: the request details are kept, so trying again resumes at the upload
      failWith("The upload was interrupted. Your details are saved on this page, so just press the button again.");
    }
  }

  if (phase === "received") {
    return (
      <div className="bg-white border border-navy/15 p-8 desktop:p-12" role="status">
        <p className="font-body font-medium text-[0.68rem] tracking-[0.38em] uppercase text-gold mb-5">Request received</p>
        <h3 ref={doneRef} tabIndex={-1} className="font-display font-light text-navy text-[clamp(1.9rem,3.6vw,2.8rem)] leading-tight focus:outline-none">
          Thank you. Brenda has your disclosures.
        </h3>
        <p className="font-body font-light text-base leading-relaxed text-charcoal-light mt-5">
          Your upload for <strong className="font-medium text-charcoal">{receivedAddress}</strong> arrived safely. The
          documents will be analyzed, and Brenda will personally reach out to walk you through the findings and
          discuss your next steps.
        </p>
        <p className="font-body font-light text-sm leading-relaxed text-charcoal-light mt-4">
          Your report is not ready yet, and nothing has been reviewed so far. If you need anything in the meantime,
          call{" "}
          <a href={`tel:${siteConfig.agent.phoneRaw}`} className="text-navy underline underline-offset-4">
            {siteConfig.agent.phone}
          </a>{" "}
          or email{" "}
          <a href={`mailto:${siteConfig.agent.email}`} className="text-navy underline underline-offset-4">
            {siteConfig.agent.email}
          </a>
          .
        </p>
        <Link
          href="/"
          className="inline-block mt-8 font-ui font-medium text-[0.76rem] tracking-[0.14em] uppercase text-navy border-b border-gold pb-1 hover:text-teal transition-colors"
        >
          Back to the home page &rarr;
        </Link>
      </div>
    );
  }

  if (open === false) {
    return (
      <div className="bg-white border border-navy/15 p-8 desktop:p-12">
        <h3 className="font-display font-light text-navy text-3xl leading-tight">Uploads are paused right now.</h3>
        <p className="font-body font-light text-base leading-relaxed text-charcoal-light mt-4">
          Brenda can still help with your disclosures. Call{" "}
          <a href={`tel:${siteConfig.agent.phoneRaw}`} className="text-navy underline underline-offset-4">
            {siteConfig.agent.phone}
          </a>{" "}
          or email{" "}
          <a href={`mailto:${siteConfig.agent.email}`} className="text-navy underline underline-offset-4">
            {siteConfig.agent.email}
          </a>
          .
        </p>
      </div>
    );
  }

  const busy = phase !== "form";
  const fieldError = (key: keyof IntakeErrors) =>
    errors[key] ? (
      <p id={`${uid}-${key}-error`} className={errorClass}>
        {errors[key]}
      </p>
    ) : null;
  const describedBy = (key: keyof IntakeErrors) => (errors[key] ? `${uid}-${key}-error` : undefined);

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="bg-white border border-navy/15 p-6 desktop:p-10" aria-busy={busy}>
      <div ref={errorRef} tabIndex={-1} aria-live="assertive" className="focus:outline-none">
        {serverError && (
          <p className="mb-6 border-l-2 border-[#A12C1B] bg-[#FBEFEC] px-4 py-3 font-body text-sm text-[#7A2E1E]">{serverError}</p>
        )}
      </div>

      <fieldset disabled={busy} className="border-0 p-0 m-0 min-w-0 space-y-7">
        <legend className="sr-only">Disclosure upload</legend>

        <div>
          <label htmlFor={`${uid}-address`} className={labelClass}>
            Property address
          </label>
          <input
            id={`${uid}-address`}
            name="propertyAddress"
            data-field="propertyAddress"
            type="text"
            autoComplete="off"
            maxLength={300}
            placeholder="Street, city, ZIP"
            aria-invalid={!!errors.propertyAddress}
            aria-describedby={describedBy("propertyAddress")}
            className={inputClass}
          />
          {fieldError("propertyAddress")}
        </div>

        <div>
          <span id={`${uid}-file-label`} className={labelClass}>
            Disclosure PDF
          </span>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (!busy) chooseFile(e.dataTransfer.files?.[0] ?? null);
            }}
            className={`border border-dashed px-5 py-7 text-center transition-colors ${
              dragging ? "border-teal bg-teal/5" : "border-navy/35 bg-cream/60"
            }`}
          >
            <input
              ref={fileRef}
              id={`${uid}-file`}
              type="file"
              accept="application/pdf,.pdf"
              aria-labelledby={`${uid}-file-label`}
              aria-invalid={!!errors.file}
              aria-describedby={`${uid}-file-hint${errors.file ? ` ${uid}-file-error` : ""}`}
              onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
              className="sr-only peer"
            />
            {file ? (
              <p className="font-body text-base text-navy break-all">
                {file.name} <span className="text-charcoal-light">({formatBytes(file.size)})</span>
              </p>
            ) : (
              <p className="font-body font-light text-base text-charcoal-light">Drag your PDF here, or</p>
            )}
            <label
              htmlFor={`${uid}-file`}
              className="inline-flex items-center justify-center mt-3 h-11 px-6 border border-navy text-navy font-ui font-medium text-[0.72rem] tracking-[0.14em] uppercase cursor-pointer hover:bg-navy hover:text-cream transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-gold peer-focus-visible:outline-offset-2"
            >
              {file ? "Choose a different file" : "Choose a file"}
            </label>
            <p id={`${uid}-file-hint`} className="font-body font-light text-xs text-charcoal-light mt-3">
              One PDF, up to {maxMb} MB. If the disclosures came as several files, combine them or send the main
              package and mention the rest below.
            </p>
          </div>
          {fieldError("file")}
        </div>

        <div className="grid gap-7 tablet:grid-cols-2">
          <div>
            <label htmlFor={`${uid}-name`} className={labelClass}>
              Full name
            </label>
            <input
              id={`${uid}-name`}
              name="fullName"
              data-field="fullName"
              type="text"
              autoComplete="name"
              maxLength={120}
              aria-invalid={!!errors.fullName}
              aria-describedby={describedBy("fullName")}
              className={inputClass}
            />
            {fieldError("fullName")}
          </div>
          <div>
            <label htmlFor={`${uid}-email`} className={labelClass}>
              Email
            </label>
            <input
              id={`${uid}-email`}
              name="email"
              data-field="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              maxLength={200}
              aria-invalid={!!errors.email}
              aria-describedby={describedBy("email")}
              className={inputClass}
            />
            {fieldError("email")}
          </div>
        </div>

        <div className="grid gap-7 tablet:grid-cols-2">
          <div>
            <label htmlFor={`${uid}-phone`} className={labelClass}>
              Phone{" "}
              <span className="font-light text-charcoal-light">
                {preferredContact === "phone" ? "(needed for a call)" : "(optional)"}
              </span>
            </label>
            <input
              id={`${uid}-phone`}
              name="phone"
              data-field="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              maxLength={40}
              aria-required={preferredContact === "phone"}
              aria-invalid={!!errors.phone}
              aria-describedby={describedBy("phone")}
              className={inputClass}
            />
            {fieldError("phone")}
          </div>
          <fieldset className="border-0 p-0 m-0 min-w-0">
            <legend className={labelClass}>How should Brenda reach you?</legend>
            <div className="flex gap-3">
              {(["email", "phone"] as const).map((value) => (
                <label
                  key={value}
                  className={`flex-1 flex items-center justify-center h-12 border cursor-pointer font-body text-base transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold has-[:focus-visible]:outline-offset-2 ${
                    preferredContact === value ? "border-navy bg-navy text-cream" : "border-navy/25 bg-white text-charcoal hover:border-navy"
                  }`}
                >
                  <input
                    type="radio"
                    name="preferredContact"
                    data-field={value === "email" ? "preferredContact" : undefined}
                    value={value}
                    checked={preferredContact === value}
                    onChange={() => setPreferredContact(value)}
                    className="sr-only"
                  />
                  {value === "email" ? "Email" : "Phone call"}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <fieldset className="border-0 p-0 m-0 min-w-0">
          <legend className={labelClass}>
            {AGENT_STATUS_QUESTION} <span className="font-light text-charcoal-light">(optional)</span>
          </legend>
          <div className="space-y-2">
            {AGENT_STATUS_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-3 min-h-12 px-4 py-2 border cursor-pointer font-body text-base transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold has-[:focus-visible]:outline-offset-2 ${
                  agentStatus === option.value ? "border-navy bg-cream" : "border-navy/20 bg-white hover:border-navy/60"
                }`}
              >
                <input
                  type="radio"
                  name="agentStatus"
                  value={option.value}
                  checked={agentStatus === option.value}
                  onChange={() => setAgentStatus(option.value)}
                  className="w-4 h-4 accent-[#0F1D35] shrink-0"
                />
                {option.label}
              </label>
            ))}
          </div>
          {agentStatus && (
            <button
              type="button"
              onClick={() => setAgentStatus(null)}
              className="mt-2 font-body text-sm text-charcoal-light underline underline-offset-4 hover:text-navy cursor-pointer"
            >
              Clear my answer
            </button>
          )}
        </fieldset>

        <div>
          <label htmlFor={`${uid}-questions`} className={labelClass}>
            Anything you want Brenda to look for? <span className="font-light text-charcoal-light">(optional)</span>
          </label>
          <textarea
            id={`${uid}-questions`}
            name="questions"
            rows={4}
            maxLength={2000}
            className={`${inputClass} h-auto py-3 resize-y`}
          />
        </div>

        {/* Honeypot: hidden from people and assistive tech, tempting to bots */}
        <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
          <label>
            Website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              data-field="consent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              aria-invalid={!!errors.consent}
              aria-describedby={describedBy("consent")}
              className="mt-1 w-5 h-5 accent-[#0F1D35] shrink-0"
            />
            <span className="font-body font-light text-sm leading-relaxed text-charcoal">
              {HC_CONSENT_NOTICE} See the{" "}
              <Link href="/privacy#home-clarity" className="text-navy underline underline-offset-4">
                privacy policy
              </Link>{" "}
              for who receives your documents and how to have them deleted.
            </span>
          </label>
          {fieldError("consent")}
        </div>
      </fieldset>

      <div className="mt-8">
        {phase === "uploading" && (
          <div className="mb-4">
            <div
              role="progressbar"
              aria-label="Upload progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="h-1.5 bg-navy/10 overflow-hidden"
            >
              <div className="h-full bg-teal transition-[width] duration-200" style={{ width: `${progress}%` }} />
            </div>
            <p className="font-body text-sm text-charcoal-light mt-2">
              {progress < 99 ? `Uploading… ${progress}%` : "Finishing up…"}
            </p>
          </div>
        )}
        <button
          type="submit"
          disabled={busy || open === null}
          className="w-full tablet:w-auto inline-flex items-center justify-center h-[52px] px-10 bg-navy text-cream font-ui font-medium text-[0.78rem] tracking-[0.14em] uppercase hover:bg-navy-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {phase === "saving" ? "Sending…" : phase === "uploading" ? "Uploading…" : "Upload your disclosures"}
        </button>
        <p className="font-body font-light text-xs text-charcoal-light mt-4">
          Complimentary analysis. Personal follow-up. No obligation.
        </p>
      </div>
    </form>
  );
}
