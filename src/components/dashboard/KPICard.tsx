import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";

type CardVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral" | "purple" | "orange";

interface KPICardProps {
  title: string;
  value: string;
  rawValue?: number;
  subtitle?: string;
  delta?: number;
  deltaLabel?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  className?: string;
  variant?: CardVariant;
  animateValue?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
  valueDecimals?: number;
  progressValue?: number;
}

const variantStyles: Record<CardVariant, { icon: string; trend: string; card: string }> = {
  default: { icon: "bg-accent/10 text-accent", trend: "", card: "" },
  success: { icon: "bg-success/10 text-success", trend: "text-success", card: "bg-success/5 border border-success/10" },
  warning: { icon: "bg-warning/10 text-warning", trend: "text-warning", card: "bg-warning/5 border border-warning/10" },
  danger: { icon: "bg-destructive/10 text-destructive", trend: "text-destructive", card: "bg-destructive/5 border border-destructive/10" },
  info: { icon: "bg-primary/10 text-primary", trend: "text-primary", card: "bg-primary/5 border border-primary/10" },
  neutral: { icon: "bg-muted text-muted-foreground", trend: "", card: "" },
  purple: { icon: "bg-[hsl(270,70%,50%)]/10 text-[hsl(270,70%,50%)]", trend: "", card: "bg-[hsl(270,70%,50%)]/5 border border-[hsl(270,70%,50%)]/10" },
  orange: { icon: "bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)]", trend: "", card: "" },
};

export function KPICard({
  title,
  value,
  rawValue,
  subtitle,
  delta,
  deltaLabel,
  icon,
  loading = false,
  className,
  variant = "default",
  animateValue = true,
  valuePrefix = "",
  valueSuffix = "",
  valueDecimals = 0,
}: KPICardProps) {
  const displayValue = value;

  const styles = variantStyles[variant];

  if (loading) {
    return (
      <Card className={cn(className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-muted rounded w-24 animate-pulse" />
            <div className="w-10 h-10 bg-muted rounded-xl animate-pulse" />
          </div>
          <div className="h-8 bg-muted rounded w-32 animate-pulse" />
          <div className="h-3 bg-muted rounded w-20 animate-pulse mt-2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(styles.card, className)}>
      <CardContent className="p-4 flex gap-4">
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <p className="text-[1.65rem] font-bold leading-tight">{displayValue}</p>
        {(delta !== undefined || subtitle) && (
          <div className="flex items-center gap-1 mt-2">
            {delta !== undefined && (
              <>
                {delta > 0 ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : delta < 0 ? (
                  <TrendingDown className="w-4 h-4 text-destructive" />
                ) : (
                  <Minus className="w-4 h-4 text-muted-foreground" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground"
                )}>
                  {delta > 0 ? "+" : ""}{delta.toFixed(1)}%
                </span>
              </>
            )}
            {deltaLabel && (
              <span className="text-xs text-muted-foreground">{deltaLabel}</span>
            )}
            {subtitle && !delta && (
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            )}
          </div>
        )}
        </div>
        {icon && (
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 self-center", styles.icon)}>
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
