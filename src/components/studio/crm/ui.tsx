"use client";

// Shared CRM UI primitives. Brand: navy chrome, cream canvas, ivory cards,
// gold hairlines; DM Sans caps for labels, Outfit for body, Cormorant for names.

import { useEffect, useRef, useState } from "react";
import { avatarColor, initials } from "@/lib/crm/format";
import { paletteFor } from "./stageColors";

export const inputCls =
  "w-full bg-white border border-navy/10 rounded-xl px-3 py-2.5 font-body text-sm text-navy placeholder:text-charcoal-light/60 focus:outline-none focus:border-teal";
export const selectCls = inputCls;
export const labelCls = "font-ui text-[0.65rem] tracking-wider uppercase text-charcoal-light";
export const cardCls = "bg-[#FCFBF7] rounded-lg border border-navy/10 shadow-[0_1px_3px_rgba(15,29,53,0.06)]";

export function Card({ children, className = "", ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`${cardCls} ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  action,
  count,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  count?: number;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="font-display font-medium text-base text-navy leading-tight">
          {children}
          {typeof count === "number" && (
            <span className="ml-2 font-ui text-[0.65rem] text-charcoal-light tabular-nums align-middle">{count}</span>
          )}
        </h2>
        <div className="w-8 h-px bg-gold mt-1.5" />
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className={labelCls}>{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 font-body font-light text-xs text-charcoal-light">{hint}</p>}
    </label>
  );
}

type BtnVariant = "primary" | "secondary" | "danger" | "ghost";
export function Btn({
  variant = "primary",
  className = "",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const v: Record<BtnVariant, string> = {
    primary: "bg-navy text-gold hover:bg-navy/90",
    secondary: "bg-white border border-navy/20 text-navy hover:border-navy/40",
    danger: "bg-white border border-red-700/30 text-red-700 hover:bg-red-50",
    ghost: "text-teal hover:text-navy px-2",
  };
  return (
    <button
      type="button"
      className={`font-ui text-xs tracking-wider uppercase rounded-md px-4 py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${v[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block w-4 h-4 border-2 border-navy/20 border-t-navy rounded-full animate-spin ${className}`}
      aria-label="Loading"
    />
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <div className="font-body text-sm text-red-700">{children}</div>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="font-body font-light text-sm text-charcoal-light py-2">{children}</div>;
}

export function Avatar({
  first,
  last,
  size = "md",
  className = "",
}: {
  first: string;
  last: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const name = `${first} ${last}`.trim();
  const c = paletteFor(avatarColor(name || "?"));
  const dim = size === "lg" ? "w-16 h-16 text-2xl" : size === "sm" ? "w-8 h-8 text-xs" : "w-11 h-11 text-base";
  return (
    <span
      className={`rounded-full flex items-center justify-center shrink-0 font-display font-medium ${dim} ${className}`}
      style={{ backgroundColor: c.solid.bg, color: c.solid.text }}
      aria-hidden="true"
    >
      {initials(first, last)}
    </span>
  );
}

export function TagBubble({
  name,
  onRemove,
  onClick,
  active = false,
}: {
  name: string;
  onRemove?: () => void;
  onClick?: () => void;
  active?: boolean;
}) {
  const base = `inline-flex items-center gap-1 rounded-full font-ui text-[0.65rem] px-2.5 py-1 max-w-full ${
    active ? "bg-navy text-cream" : "bg-navy/5 text-navy"
  }`;
  const inner = (
    <>
      <span className="truncate">{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${name}`}
          className="ml-0.5 -mr-1 w-4 h-4 rounded-full flex items-center justify-center hover:bg-navy/10 leading-none"
        >
          ×
        </button>
      )}
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${base} transition-colors`}>
        {inner}
      </button>
    );
  }
  return <span className={base}>{inner}</span>;
}

// ------------------------------------------------------------
// Sheet: bottom sheet on phones, centered modal on ≥sm.
// ------------------------------------------------------------
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-navy/40 backdrop-blur-[1px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-md"} bg-cream rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-navy/10 shrink-0">
          <div className="font-display font-medium text-lg text-navy">{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal-light hover:bg-navy/5 text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-navy/10 bg-cream rounded-b-2xl shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// SegmentedTabs
// ------------------------------------------------------------
export interface SegTab<T extends string> {
  key: T;
  label: string;
  count?: number;
}
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  className = "",
}: {
  tabs: SegTab<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex gap-1 bg-navy/5 rounded-xl p-1 overflow-x-auto ${className}`} role="tablist">
      {tabs.map((t) => {
        const active = t.key === value;
        // Up to 4 tabs share the width evenly; more than that scrolls.
        const sizing = tabs.length > 4 ? "shrink-0" : "flex-1 min-w-0";
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={`${sizing} font-ui text-[0.7rem] tracking-wider uppercase px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
              active ? "bg-white text-navy shadow-[0_1px_2px_rgba(15,29,53,0.12)]" : "text-charcoal-light hover:text-navy"
            }`}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span className={`ml-1.5 tabular-nums ${active ? "opacity-70" : "opacity-60"}`}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------
// Menu (⋯ popover)
// ------------------------------------------------------------
export interface MenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}
export function Menu({
  items,
  trigger,
  align = "right",
  label = "More",
}: {
  items: MenuItem[];
  trigger?: React.ReactNode;
  align?: "left" | "right";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal-light hover:bg-navy/5 hover:text-navy text-lg leading-none"
      >
        {trigger ?? "⋯"}
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute ${align === "right" ? "right-0" : "left-0"} mt-1 z-50 bg-white border border-navy/10 rounded-lg shadow-lg min-w-[180px] py-1`}
        >
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
              className={`w-full text-left font-body text-sm px-4 py-2.5 hover:bg-cream ${
                it.danger ? "text-red-700" : "text-navy"
              }`}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Chip (filter/toggle pill)
// ------------------------------------------------------------
export function Chip({
  active,
  onClick,
  children,
  style,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={style}
      className={`shrink-0 font-ui text-xs tracking-wider uppercase px-3.5 py-2 rounded-full border transition-colors ${
        active ? "bg-navy text-cream border-navy" : "bg-white text-navy border-navy/20 hover:border-navy/40"
      } ${className}`}
    >
      {children}
    </button>
  );
}

// Studio fetch helper: credentials + no-store, 401 → reload.
export async function crmFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const r = await fetch(input, { credentials: "include", cache: "no-store", ...init });
  if (r.status === 401) window.location.reload();
  return r;
}

export async function crmJson<T>(input: string, init: RequestInit = {}): Promise<T> {
  const r = await crmFetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!r.ok) {
    const msg = await r
      .json()
      .then((j: { error?: string }) => j.error ?? "Something went wrong. Try again.")
      .catch(() => "Something went wrong. Try again.");
    throw new Error(msg);
  }
  return (await r.json()) as T;
}
