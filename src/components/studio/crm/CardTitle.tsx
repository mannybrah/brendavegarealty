// Shared "card/section title" idiom for the CRM: a Cormorant navy heading
// with a short gold hairline underneath, replacing the flat small-caps
// labels that used to head every card. Renders an <h2> — callers own their
// own top spacing (space-y-* on the parent), this component owns its own
// bottom margin so it always sits flush against the content that follows.
export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="font-display font-medium text-base text-navy leading-tight">{children}</h2>
      <div className="w-8 h-px bg-gold mt-1.5" />
    </div>
  );
}
