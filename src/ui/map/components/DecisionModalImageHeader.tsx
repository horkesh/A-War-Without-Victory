interface DecisionModalImageHeaderProps {
  imageUrl: string;
  imageAlt: string;
  eyebrow: string;
  title: string;
  titleId: string;
  description?: string;
  accentClassName?: string;
  /** Optional test id placed on the image element. */
  imageTestId?: string;
}

export function DecisionModalImageHeader({
  imageUrl,
  imageAlt,
  eyebrow,
  title,
  titleId,
  description,
  accentClassName = 'text-accent-gold',
  imageTestId,
}: DecisionModalImageHeaderProps) {
  return (
    <div className="relative min-h-44 shrink-0 overflow-hidden border-b border-[#262b35]">
      <img src={imageUrl} alt={imageAlt} data-testid={imageTestId} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/82 to-black/50" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
      <div className="relative flex min-h-44 flex-col justify-end gap-1.5 px-8 py-6">
        <div className={`font-mono text-[13px] font-semibold uppercase tracking-[0.18em] ${accentClassName}`}>{eyebrow}</div>
        <h2 id={titleId} className="m-0 max-w-[40rem] text-[30px] font-semibold leading-tight text-[#f6ecd2]">{title}</h2>
        {description && (
          <p className="m-0 max-w-[36rem] text-[17px] leading-relaxed text-[#e2d6b8] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{description}</p>
        )}
      </div>
    </div>
  );
}
