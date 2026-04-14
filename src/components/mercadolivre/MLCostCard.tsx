import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Truck, Megaphone, Package } from "lucide-react";

interface CostSummary {
  comissao: number;
  frete: number;
  publicidade: number;
  custo_produto: number;
  impostos: number;
  total_known: number;
  gross_revenue: number;
  pct_receita: number;
}

const currencyFmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function MLCostCard({ costSummary }: { costSummary: CostSummary }) {
  return (
    <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="h-full relative overflow-hidden opacity-75 border border-dashed border-muted-foreground/30">
        <div className="absolute top-2 right-2 z-10">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Em desenvolvimento
          </span>
        </div>
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Custos</span>
        </div>
        <CardContent className="px-4 pb-4">
          <div className="space-y-1">
            <div className="flex items-end justify-between pb-2 mb-1 border-b border-border">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total de custos</p>
                <p className="text-xl font-bold tabular-nums text-red-500">{currencyFmt(costSummary.total_known)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Receita bruta</p>
                <p className="text-sm font-semibold tabular-nums text-foreground">{currencyFmt(costSummary.gross_revenue)}</p>
              </div>
            </div>

            {[
              { icon: <DollarSign className="w-3.5 h-3.5 text-orange-400" />, label: "Comissão ML", value: costSummary.comissao },
              { icon: <Truck className="w-3.5 h-3.5 text-blue-400" />, label: "Frete", value: costSummary.frete },
              { icon: <Megaphone className="w-3.5 h-3.5 text-purple-400" />, label: "Publicidade", value: costSummary.publicidade },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-xs py-1">
                <span className="flex items-center gap-1.5 text-muted-foreground">{item.icon}{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {costSummary.gross_revenue > 0 ? `${((item.value / costSummary.gross_revenue) * 100).toFixed(1)}%` : "—"}
                  </span>
                  <span className="font-semibold tabular-nums">{currencyFmt(item.value)}</span>
                </div>
              </div>
            ))}

            <div className="pt-2 mt-1 border-t border-border/50 space-y-1">
              {[
                { icon: <Package className="w-3.5 h-3.5 text-muted-foreground/50" />, label: "Custo produto" },
                { icon: <DollarSign className="w-3.5 h-3.5 text-muted-foreground/50" />, label: "Impostos" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs py-0.5 opacity-50">
                  <span className="flex items-center gap-1.5 text-muted-foreground">{item.icon}{item.label}</span>
                  <span className="text-[10px] italic text-muted-foreground">a informar</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs pt-2 mt-1 border-t border-border">
              <span className="text-muted-foreground font-medium">Lucro estimado</span>
              <span className={`font-bold tabular-nums ${(costSummary.gross_revenue - costSummary.total_known) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {currencyFmt(costSummary.gross_revenue - costSummary.total_known)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
