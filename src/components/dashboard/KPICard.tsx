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
}

const variantStyles: Record<CardVariant, { icon: string; trend: string }> = {
  default: { icon: "bg-accent/10 text-accent", trend: "" },
  success: { icon: "bg-success/10 text-success", trend: "text-success" },
  warning: { icon: "bg-warning/10 text-warning", trend: "text-warning" },
  danger: { icon: "bg-destructive/10 text-destructive", trend: "text-destructive" },
  info: { icon: "bg-primary/10 text-primary", trend: "text-primary" },
  neutral: { icon: "bg-muted text-muted-foreground", trend: "" },
  purple: { icon: "bg-[hsl(270,70%,50%)]/10 text-[hsl(270,70%,50%)]", trend: "" },
  orange: { icon: "bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)]", trend: "" },
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
    <Card className={cn(className)}>
      <CardContent className="p-4 flex items-center gap-4">
        {icon && (
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", styles.icon)}>
            {icon}
          </div>
        )}
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
      </CardContent>
    </Card>
  );
}
