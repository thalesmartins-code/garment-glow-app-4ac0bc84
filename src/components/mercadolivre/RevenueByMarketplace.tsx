import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, ChevronDown } from "lucide-react";

export interface StoreRevenue {
  name: string;
  revenue: number;
  orders: number;
}

export interface MarketplaceRevenueGroup {
  mpId: string;
  mpName: string;
  icon: LucideIcon;
  gradient: string;
  totalRevenue: number;
  totalOrders: number;
  stores: StoreRevenue[];
}

interface Props {
  groups: MarketplaceRevenueGroup[];
}

const currencyFmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const GRADIENT_HEX: Record<string, string> = {
  "from-yellow-500 to-amber-500": "hsl(45, 93%, 47%)",
  "from-orange-500 to-amber-600": "hsl(25, 95%, 53%)",
  "from-orange-600 to-red-500": "hsl(15, 85%, 50%)",
  "from-blue-600 to-indigo-500": "hsl(225, 70%, 55%)",
  "from-purple-600 to-violet-500": "hsl(270, 60%, 55%)",
  "from-gray-500 to-gray-600": "hsl(0, 0%, 45%)",
  "from-red-500 to-red-600": "hsl(0, 72%, 51%)",
  "from-blue-500 to-blue-600": "hsl(217, 70%, 55%)",
  "from-gray-600 to-gray-700": "hsl(0, 0%, 40%)",
};

function barColor(gradient: string): string {
  return GRADIENT_HEX[gradient] ?? "hsl(var(--primary))";
}

export function RevenueByMarketplace({ groups }: Props) {
  const [expanded, setExpanded] = useState(false);
  const maxRevenue = Math.max(...groups.map((g) => g.totalRevenue), 1);
  const grandTotal = groups.reduce((s, g) => s + g.totalRevenue, 0);

  if (groups.length === 0) return null;

  return (
    <Card>
      <CardHeader
        className="pb-2 px-4 pt-4 cursor-pointer select-none"
        onClick={() => setExpanded((p) => !p)}
      >
        <CardTitle className="text-base flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4" />
          <span className="flex-1">Faturamento por Marketplace</span>
          <span className="text-sm font-semibold tabular-nums">
            {currencyFmt(grandTotal)}
          </span>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        </CardTitle>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* Segmented summary bar — always visible */}
        <div
          className="flex h-3 w-full rounded-full overflow-hidden bg-muted/40 cursor-pointer"
          onClick={() => setExpanded((p) => !p)}
        >
          {groups.map((g) => {
            const pct = grandTotal > 0 ? (g.totalRevenue / grandTotal) * 100 : 0;
            return (
              <motion.div
                key={g.mpId}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ background: barColor(g.gradient) }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                title={`${g.mpName}: ${currencyFmt(g.totalRevenue)} (${pct.toFixed(0)}%)`}
              />
            );
          })}
        </div>

        {/* Legend chips */}
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {groups.map((g) => {
            const pct = grandTotal > 0 ? ((g.totalRevenue / grandTotal) * 100) : 0;
            return (
              <div key={g.mpId} className="flex items-center gap-1 text-xs text-muted-foreground">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: barColor(g.gradient) }}
                />
                <span>{g.mpName}</span>
                <span className="tabular-nums font-medium">{pct.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>

        {/* Expanded detail */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              className="space-y-3 overflow-hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {groups.map((g, idx) => {
                const pct = grandTotal > 0 ? ((g.totalRevenue / grandTotal) * 100) : 0;
                const barW = Math.max((g.totalRevenue / maxRevenue) * 100, 2);
                const color = barColor(g.gradient);
                const Icon = g.icon;

                return (
                  <motion.div
                    key={g.mpId}
                    className="space-y-1.5"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: idx * 0.08, ease: "easeOut" }}
                  >
                    {/* Marketplace row */}
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-white"
                        style={{ background: color }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-medium text-foreground w-[100px] truncate shrink-0">
                        {g.mpName}
                      </span>
                      <div className="flex-1 h-5 rounded-md bg-muted/50 overflow-hidden">
                        <motion.div
                          className="h-full rounded-md"
                          style={{ background: color, opacity: 0.85 }}
                          initial={{ width: 0 }}
                          animate={{ width: `${barW}%` }}
                          transition={{ duration: 0.7, delay: idx * 0.08 + 0.2, ease: "easeOut" }}
                        />
                      </div>
                      <span className="text-sm font-semibold tabular-nums w-[110px] text-right shrink-0">
                        {currencyFmt(g.totalRevenue)}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums w-[40px] text-right shrink-0">
                        {pct.toFixed(0)}%
                      </span>
                    </div>

                    {/* Store rows */}
                    {g.stores.length > 1 &&
                      g.stores.map((store, sIdx) => {
                        const storeBarW = g.totalRevenue > 0
                          ? Math.max((store.revenue / maxRevenue) * 100, 1)
                          : 0;
                        return (
                          <motion.div
                            key={store.name}
                            className="flex items-center gap-2 pl-8"
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: idx * 0.08 + 0.15 + sIdx * 0.05 }}
                          >
                            <span className="text-xs text-muted-foreground w-[100px] truncate shrink-0">
                              {store.name}
                            </span>
                            <div className="flex-1 h-3.5 rounded bg-muted/30 overflow-hidden">
                              <motion.div
                                className="h-full rounded"
                                style={{ background: color, opacity: 0.5 }}
                                initial={{ width: 0 }}
                                animate={{ width: `${storeBarW}%` }}
                                transition={{ duration: 0.6, delay: idx * 0.08 + 0.3 + sIdx * 0.05, ease: "easeOut" }}
                              />
                            </div>
                            <span className="text-xs font-medium tabular-nums w-[110px] text-right shrink-0">
                              {currencyFmt(store.revenue)}
                            </span>
                          </motion.div>
                        );
                      })}

                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
