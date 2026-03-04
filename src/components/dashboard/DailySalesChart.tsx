import { useMemo, useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DailySale } from "@/data/mockData";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";

interface DailySalesChartProps {
  data: DailySale[];
  loading?: boolean;
  selectedMarketplace?: string;
}

export function DailySalesChart({ data, loading = false, selectedMarketplace = "all" }: DailySalesChartProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Auto-open when specific marketplace selected
  useEffect(() => {
    if (selectedMarketplace !== "all") setIsOpen(true);
  }, [selectedMarketplace]);

  const chartData = useMemo(() => {
    return data.map((day) => ({
      dia: `Dia ${day.dia}`,
      vendaTotal: day.vendaTotal,
      metaVendas: day.metaVendas,
      vendaAnoAnterior: day.vendaAnoAnterior,
    }));
  }, [data]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-48 animate-pulse" />
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="w-full h-full bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors flex flex-row items-center justify-between">
            <CardTitle className="text-base">Evolução de vendas</CardTitle>
            <ChevronDown 
              className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`} 
            />
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="p-4 sm:p-6">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="dia" 
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis 
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === "vendaTotal" ? "Venda Bruta Aprovada" : name === "metaVendas" ? "Meta" : "Ano anterior",
                  ]}
                  labelFormatter={(label) => label}
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "var(--shadow-md)",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                  itemStyle={{ color: "hsl(var(--muted-foreground))" }}
                />
                <Legend 
                  formatter={(value) => 
                    value === "vendaTotal" ? "Venda Bruta Aprovada" : 
                    value === "metaVendas" ? "Meta" : 
                    "Ano anterior"
                  }
                  wrapperStyle={{ paddingTop: 16 }}
                />
                <Line
                  type="monotone"
                  dataKey="vendaTotal"
                  stroke="hsl(var(--success))"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "hsl(var(--success))" }}
                  activeDot={{ r: 5, fill: "hsl(var(--success))" }}
                />
                <Line
                  type="monotone"
                  dataKey="metaVendas"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 2, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
                />
                <Line
                  type="monotone"
                  dataKey="vendaAnoAnterior"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, fill: "hsl(var(--muted-foreground))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
