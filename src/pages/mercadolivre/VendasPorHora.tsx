import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HourlyHeatmap } from "@/components/mercadolivre/HourlyHeatmap";
import { HourlyStackedBars } from "@/components/mercadolivre/HourlyStackedBars";
import { HourlyRadar } from "@/components/mercadolivre/HourlyRadar";
import { HourlySalesTable } from "@/components/mercadolivre/HourlySalesTable";
import { getAllMarketplaceMockHourly } from "@/data/marketplaceMockData";
import { Clock, Grid3X3, BarChart3, Radar, LayoutDashboard, Circle } from "lucide-react";
import { HourlyBubbleChart } from "@/components/mercadolivre/HourlyBubbleChart";
import { motion } from "framer-motion";

export default function VendasPorHora() {
  const hourlyData = getAllMarketplaceMockHourly();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Vendas por Hora</h1>
            <p className="text-sm text-muted-foreground">
              Compare os formatos e escolha o que melhor atende sua análise
            </p>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="heatmap" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
          <TabsTrigger value="heatmap" className="gap-1.5 text-xs sm:text-sm">
            <Grid3X3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Heatmap</span>
          </TabsTrigger>
          <TabsTrigger value="bars" className="gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Barras</span>
          </TabsTrigger>
          <TabsTrigger value="radar" className="gap-1.5 text-xs sm:text-sm">
            <Radar className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Radar</span>
          </TabsTrigger>
          <TabsTrigger value="combined" className="gap-1.5 text-xs sm:text-sm">
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Combinado</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="heatmap">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <HourlyHeatmap />
          </motion.div>
        </TabsContent>

        <TabsContent value="bars">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <HourlyStackedBars />
          </motion.div>
        </TabsContent>

        <TabsContent value="radar">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <HourlyRadar />
          </motion.div>
        </TabsContent>

        <TabsContent value="combined">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <HourlyHeatmap />
            <HourlySalesTable hourly={hourlyData} title="Detalhamento por Hora" />
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
