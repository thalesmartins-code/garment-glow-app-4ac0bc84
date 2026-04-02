interface Props {
  title: string;
  children?: React.ReactNode;
  lastUpdated?: Date | null;
}

export function MLPageHeader({ title, children, lastUpdated }: Props) {
  const formattedDate = lastUpdated
    ? lastUpdated.toLocaleString("pt-BR")
    : null;

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">{title}</h1>
        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
          {formattedDate ? `Última sinc: ${formattedDate}` : "Nunca sincronizado"}
        </p>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
