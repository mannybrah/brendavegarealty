"use client";

import { useId, useRef, useState } from "react";

// An ILLUSTRATIVE report. These findings are invented to show the format; they do not
// describe any real property, and nothing here is produced from an uploaded document.
// Keep the "Sample" labels wherever this component is shown.
const TOPICS = [
  {
    key: "electrical",
    label: "Electrical",
    level: "Worth a closer look",
    tone: "bg-[#F6E7C8] text-[#6B4E12]",
    finding: "Seller notes the main electrical panel was replaced without a permit on file.",
    why: "Unpermitted electrical work can affect insurance, resale, and what a lender or inspector will ask for.",
    source: "Sample disclosure, page 4",
    questions: [
      "Who performed the panel replacement, and when?",
      "Can the seller provide a receipt or close out a permit before closing?",
    ],
  },
  {
    key: "moisture",
    label: "Moisture",
    level: "Potential concern",
    tone: "bg-[#F3D9D2] text-[#7A2E1E]",
    finding: "A past roof leak over the hallway is disclosed as repaired, with no repair invoice included.",
    why: "Without documentation it is hard to tell whether the cause was fixed or only the visible staining.",
    source: "Sample disclosure, page 7",
    questions: [
      "Is there an invoice or warranty for the roof repair?",
      "Has the area been checked for moisture since the repair?",
    ],
  },
  {
    key: "documents",
    label: "Documents",
    level: "Good to know",
    tone: "bg-[#DCEAE5] text-[#1E5548]",
    finding: "The package refers to a pest inspection report that is not included in the upload.",
    why: "A missing report is not a red flag by itself, but you will want to read it before you write an offer.",
    source: "Sample disclosure, page 2",
    questions: ["Can the listing agent send the full pest inspection report?"],
  },
];

export function SampleReport() {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const topic = TOPICS[active];

  function onKeyDown(e: React.KeyboardEvent) {
    let next = active;
    if (e.key === "ArrowRight") next = (active + 1) % TOPICS.length;
    else if (e.key === "ArrowLeft") next = (active + TOPICS.length - 1) % TOPICS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TOPICS.length - 1;
    else return;
    e.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }

  return (
    <div className="bg-warm-white text-charcoal shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between gap-4 px-6 desktop:px-8 py-5 border-b border-navy/10">
        <div>
          <p className="font-body font-medium text-[0.6rem] tracking-[0.3em] uppercase text-gold">
            Brenda Vega&rsquo;s Home Clarity
          </p>
          <p className="font-display text-xl text-navy mt-1">Disclosure report</p>
        </div>
        <span className="shrink-0 font-ui font-medium text-[0.62rem] tracking-[0.16em] uppercase border border-navy/30 text-navy px-3 py-1.5">
          Sample report
        </span>
      </div>

      <div role="tablist" aria-label="Sample report topics" className="flex border-b border-navy/10" onKeyDown={onKeyDown}>
        {TOPICS.map((t, i) => (
          <button
            key={t.key}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`${baseId}-tab-${t.key}`}
            aria-selected={i === active}
            aria-controls={`${baseId}-panel`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            className={`flex-1 min-h-[52px] px-2 font-ui font-medium text-[0.72rem] tracking-[0.12em] uppercase border-b-2 -mb-px transition-colors cursor-pointer ${
              i === active ? "border-gold text-navy" : "border-transparent text-charcoal-light hover:text-navy"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${topic.key}`}
        tabIndex={0}
        className="px-6 desktop:px-8 py-7 min-h-[330px]"
      >
        <span className={`inline-block font-ui font-medium text-[0.66rem] tracking-[0.12em] uppercase px-2.5 py-1 ${topic.tone}`}>
          {topic.level}
        </span>
        <p className="font-display text-[1.45rem] leading-snug text-navy mt-4">{topic.finding}</p>
        <p className="font-body font-light text-sm leading-relaxed text-charcoal-light mt-3">{topic.why}</p>
        <p className="font-body text-xs text-charcoal-light/80 mt-3">{topic.source}</p>
        <p className="font-body font-medium text-[0.62rem] tracking-[0.26em] uppercase text-gold mt-6 mb-2">
          Questions worth asking
        </p>
        <ul className="list-none p-0 m-0 space-y-2">
          {topic.questions.map((q) => (
            <li key={q} className="font-body font-light text-sm text-charcoal pl-4 border-l border-gold/60">
              {q}
            </li>
          ))}
        </ul>
      </div>

      <p className="px-6 desktop:px-8 py-4 border-t border-navy/10 font-body font-light text-[0.72rem] leading-relaxed text-charcoal-light">
        Illustrative example only. These findings are made up to show the format and do not describe any real
        property.
      </p>
    </div>
  );
}
