import { AreaChart } from "lucide-react";

interface PageLoaderProps {
  label?: string;
}

export function PageLoader({ label = "Carregando..." }: PageLoaderProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <div className="relative flex items-center justify-center">
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-xl bg-primary/30 animate-logo-halo motion-reduce:hidden"
        />
        <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-glow flex items-center justify-center animate-logo-pulse motion-reduce:animate-pulse">
          <AreaChart className="w-7 h-7 text-primary-foreground" strokeWidth={2.25} />
        </div>
      </div>
      {label && (
        <p className="text-xs text-muted-foreground animate-pulse">{label}</p>
      )}
    </div>
  );
}