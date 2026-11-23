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
    <div className="ed-paper">
      <div className="ed-paper-header">
        <span className="ed-serif">
          <small>BRENDA VEGA&rsquo;S</small>
          Home Clarity.
        </span>
        <span className="ed-sample">Interactive sample</span>
      </div>

      <h3>
        A clearer picture.
        <br />A more considered decision.
      </h3>
      <p className="ed-paper-sub">AI first look &middot; Explore an illustrative finding below.</p>

      <div role="tablist" aria-label="Sample report topics" className="ed-findings" onKeyDown={onKeyDown}>
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
            className="ed-finding"
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
        className="ed-finding-content"
      >
        <p className="ed-kicker">{topic.level}</p>
        <h4>{topic.finding}</h4>
        <p>{topic.why}</p>
        <p className="ed-kicker" style={{ marginTop: 18 }}>
          Questions worth asking
        </p>
        <ul className="ed-questions">
          {topic.questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
        <span className="ed-source">Source context &middot; {topic.source} &mdash; illustrative reference</span>
      </div>

      <p className="ed-paper-foot">
        ILLUSTRATIVE ONLY &middot; These findings are made up to show the format and do not describe any real
        property.
      </p>
    </div>
  );
}
