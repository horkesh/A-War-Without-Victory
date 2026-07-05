interface DecisionModalImageHeaderProps {
  imageUrl: string;
  imageAlt: string;
  eyebrow: string;
  title: string;
  titleId: string;
  description?: string;
  accentClassName?: string;
}

export function DecisionModalImageHeader({
  imageUrl,
  imageAlt,
  eyebrow,
  title,
  titleId,
  description,
  accentClassName = 'text-accent-gold',
}: DecisionModalImageHeaderProps) {
  return (
    <div className="relative min-h-36 overflow-hidden border-b border-panel-border">
      <img src={imageUrl} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/78 to-black/36" />
      <div className="relative px-5 py-4">
        <div className={`text-[9px] font-bold uppercase tracking-[0.18em] ${accentClassName}`}>{eyebrow}</div>
        <h2 id={titleId} className="mt-1 max-w-[34rem] text-[18px] font-bold text-text-primary">{title}</h2>
        {description && (
          <p className="mt-2 max-w-[34rem] text-[12px] leading-relaxed text-[#d8d1c3] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{description}</p>
        )}
      </div>
    </div>
  );
}
