"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import type { LeadRequest, CalculatorSummary } from "@/types";

interface LeadCaptureModalProps {
  source: LeadRequest["source"];
  onComplete: () => void;
  calculatorSummary?: CalculatorSummary;
}

const TIMELINE_OPTIONS = [
  "0-3 months",
  "3-6 months",
  "6-12 months",
  "12+ months",
  "Just browsing",
] as const;

const LOCAL_STORAGE_KEY = "brv_lead_captured";
const PENDING_LEAD_KEY = "brv_pending_lead";

export function LeadCaptureModal({ source, onComplete, calculatorSummary }: LeadCaptureModalProps) {
  const [show, setShow] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    workingWithAgent: null as boolean | null,
    timeline: "" as string,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    // Check if lead already captured
    if (typeof window !== "undefined" && localStorage.getItem(LOCAL_STORAGE_KEY)) {
      onComplete();
      return;
    }
    setShow(true);

    // Retry pending lead if exists
    const pending = localStorage.getItem(PENDING_LEAD_KEY);
    if (pending) {
      fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: pending,
      })
        .then((res) => {
          if (res.ok) localStorage.removeItem(PENDING_LEAD_KEY);
        })
        .catch(() => {});
    }
  }, [onComplete]);

  if (!show) return null;

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) errs.name = "Name is required";
    if (!formData.email.trim() || !formData.email.includes("@")) errs.email = "Valid email is required";
    if (!formData.phone.trim() || formData.phone.replace(/\D/g, "").length < 10) errs.phone = "Valid phone is required";
    if (formData.workingWithAgent === null) errs.workingWithAgent = "Please select one";
    if (!formData.timeline) errs.timeline = "Please select your timeline";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setStatus("submitting");
    setServerError("");

    const payload: LeadRequest = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      workingWithAgent: formData.workingWithAgent!,
      timeline: formData.timeline as LeadRequest["timeline"],
      source,
      calculatorSummary,
    };

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 429) {
        setServerError("Please wait a moment before trying again.");
        setStatus("error");
        return;
      }

      if (res.status === 400) {
        const data = await res.json() as { error?: string };
        setServerError(data.error || "Please check your information.");
        setStatus("error");
        return;
      }

      // Success OR 500 (fail-open: store for retry, let user proceed)
      if (res.ok) {
        localStorage.setItem(LOCAL_STORAGE_KEY, "true");
      } else {
        // Store for background retry
        localStorage.setItem(PENDING_LEAD_KEY, JSON.stringify(payload));
        localStorage.setItem(LOCAL_STORAGE_KEY, "true");
      }

      setShow(false);
      onComplete();
    } catch {
      // Network error — store for retry, let user proceed
      localStorage.setItem(PENDING_LEAD_KEY, JSON.stringify(payload));
      localStorage.setItem(LOCAL_STORAGE_KEY, "true");
      setShow(false);
      onComplete();
    }
  }

  const inputClass =
    "w-full font-body font-light text-base text-charcoal bg-cream border border-navy/10 rounded-lg px-4 py-3 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-colors min-h-[48px]";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.2, 0, 0, 1] }}
        className="bg-warm-white rounded-2xl shadow-2xl w-full max-w-md p-8 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="font-display font-light text-2xl text-navy mb-1">
          Before we get started
        </h2>
        <p className="font-body font-light text-sm text-charcoal-light mb-6">
          Please share your information so Brenda can follow up with personalized guidance.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="lead-name" className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">
              Full Name *
            </label>
            <input
              id="lead-name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`${inputClass} ${errors.name ? "border-red-500" : ""}`}
              disabled={status === "submitting"}
            />
            {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="lead-phone" className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">
              Phone *
            </label>
            <input
              id="lead-phone"
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={`${inputClass} ${errors.phone ? "border-red-500" : ""}`}
              disabled={status === "submitting"}
            />
            {errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="lead-email" className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">
              Email *
            </label>
            <input
              id="lead-email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`${inputClass} ${errors.email ? "border-red-500" : ""}`}
              disabled={status === "submitting"}
            />
            {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Working with agent */}
          <div>
            <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-3 block">
              Are you currently working with an agent? *
            </label>
            <div className="flex gap-4">
              {[true, false].map((val) => (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => setFormData({ ...formData, workingWithAgent: val })}
                  disabled={status === "submitting"}
                  className={`flex-1 py-3 rounded-lg border text-sm font-body transition-all min-h-[48px] ${
                    formData.workingWithAgent === val
                      ? "bg-teal text-white border-teal"
                      : "bg-white text-charcoal border-navy/10 hover:border-teal"
                  }`}
                >
                  {val ? "Yes" : "No"}
                </button>
              ))}
            </div>
            {errors.workingWithAgent && (
              <p className="text-red-600 text-xs mt-1">{errors.workingWithAgent}</p>
            )}
          </div>

          {/* Timeline */}
          <div>
            <label htmlFor="lead-timeline" className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">
              Timeline to buy *
            </label>
            <select
              id="lead-timeline"
              required
              value={formData.timeline}
              onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
              className={`${inputClass} ${errors.timeline ? "border-red-500" : ""}`}
              disabled={status === "submitting"}
            >
              <option value="">Select your timeline</option>
              {TIMELINE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {errors.timeline && <p className="text-red-600 text-xs mt-1">{errors.timeline}</p>}
          </div>

          {serverError && (
            <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{serverError}</p>
          )}

          <Button type="submit" variant="gold" className="w-full" disabled={status === "submitting"}>
            {status === "submitting" ? "Submitting..." : "Continue"}
          </Button>
        </form>
      </motion.div>
    </motion.div>
  );
}
