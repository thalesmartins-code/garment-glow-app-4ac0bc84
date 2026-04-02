import { Card, CardContent } from "@/components/ui/card";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoalItem {
  label: string;
  current: number;
  target: number;
  format: "currency" | "number" | "percent";
}

interface GoalsCardProps {
  currentRevenue: number;
  currentOrders: number;
  currentTicket: number;
  currentConversion: number;
}

const formatValue = (value: number, format: GoalItem["format"]) => {
  if (format === "currency")
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  if (format === "percent") return `${value.toFixed(1)}%`;
  return value.toLocaleString("pt-BR");
};

function GoalRow({ label, current, target, format }: GoalItem) {
  const pct = Math.min((current / target) * 100, 100);
  const colorClass =
    pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{pct.toFixed(0)}%</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", colorClass)}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{formatValue(current, format)}</span>
        <span>Meta: {formatValue(target, format)}</span>
      </div>
    </div>
  );
}

export function GoalsCard({ currentRevenue, currentOrders, currentTicket, currentConversion }: GoalsCardProps) {
  const goals: GoalItem[] = [
    { label: "Receita Mensal", current: currentRevenue, target: 150000, format: "currency" },
    { label: "Pedidos", current: currentOrders, target: 500, format: "number" },
    { label: "Ticket Médio", current: currentTicket, target: 300, format: "currency" },
    { label: "Conversão", current: currentConversion, target: 5, format: "percent" },
  ];

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <Target className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Metas do Mês</span>
      </div>
      <CardContent className="px-4 pb-4 flex-1 flex flex-col justify-between gap-4">
        {goals.map((g) => (
          <GoalRow key={g.label} {...g} />
        ))}
      </CardContent>
    </Card>
  );
}
