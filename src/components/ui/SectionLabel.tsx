interface SectionLabelProps {
  children: React.ReactNode;
}

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <span className="font-body font-medium text-[0.65rem] tracking-[0.4em] uppercase text-gold">
      {children}
    </span>
  );
}
