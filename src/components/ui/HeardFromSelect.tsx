import { HEARD_FROM } from "@/lib/heardFrom";

const PLAIN = HEARD_FROM.filter((h) => !("group" in h));
const AI = HEARD_FROM.filter((h) => "group" in h);

interface HeardFromSelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

/** Optional "How did you hear about Brenda?" select shared by the public lead forms. */
export function HeardFromSelect({ id, value, onChange, className, disabled }: HeardFromSelectProps) {
  return (
    <div>
      <label htmlFor={id} className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">
        How did you hear about Brenda? (optional)
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={className} disabled={disabled}>
        <option value="">Select one</option>
        {PLAIN.slice(0, 2).map((h) => (
          <option key={h.value} value={h.value}>{h.label}</option>
        ))}
        <optgroup label="AI assistant">
          {AI.map((h) => (
            <option key={h.value} value={h.value}>{h.label}</option>
          ))}
        </optgroup>
        {PLAIN.slice(2).map((h) => (
          <option key={h.value} value={h.value}>{h.label}</option>
        ))}
      </select>
    </div>
  );
}
