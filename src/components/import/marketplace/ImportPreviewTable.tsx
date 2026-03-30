import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { MarketplaceType, ParsedImportRow } from "@/utils/marketplaceParsers";

interface Props {
  data: ParsedImportRow[];
  marketplace: MarketplaceType;
  onImportComplete: () => void;
}

export function ImportPreviewTable({ data, marketplace, onImportComplete }: Props) {
  const [importing, setImporting] = useState(false);

  const hasHourly = data.some(r => r.hour !== null);

  const handleImport = async () => {
    if (!data.length) return;
    setImporting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      if (marketplace === "shopee") {
        const rows = data.map(r => ({
          user_id: user.id,
          date: r.date,
          hour: r.hour,
          revenue: r.revenue,
          revenue_without_discounts: r.revenueWithoutDiscounts,
          orders: r.orders,
          avg_order_value: r.avgOrderValue,
          clicks: r.clicks,
          visitors: r.visitors,
          conversion_rate: r.conversionRate,
          cancelled_orders: r.cancelledOrders,
          cancelled_revenue: r.cancelledRevenue,
          returned_orders: r.returnedOrders,
          returned_revenue: r.returnedRevenue,
          buyers: r.buyers,
          new_buyers: r.newBuyers,
          existing_buyers: r.existingBuyers,
          potential_buyers: r.potentialBuyers,
          repeat_purchase_rate: r.repeatPurchaseRate,
        }));

        const { error } = await supabase
          .from("shopee_sales" as any)
          .upsert(rows as any, { onConflict: "user_id,date,hour" });

        if (error) throw error;
      } else {
        throw new Error(`Importação para ${marketplace} ainda não implementada.`);
      }

      toast.success(`${data.length} linhas importadas com sucesso!`);
      onImportComplete();
    } catch (err: any) {
      toast.error(err.message || "Erro ao importar dados.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">
          Preview — {data.length} linhas {hasHourly ? "(por hora)" : "(por dia)"}
        </CardTitle>
        <Badge variant="secondary">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Pronto para importar
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="max-h-80 overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                {hasHourly && <TableHead>Hora</TableHead>}
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Visitantes</TableHead>
                <TableHead className="text-right">Conversão</TableHead>
                <TableHead className="text-right">Cancelados</TableHead>
                <TableHead className="text-right">Compradores</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 50).map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="whitespace-nowrap">{row.date}</TableCell>
                  {hasHourly && <TableCell>{row.hour !== null ? `${String(row.hour).padStart(2, "0")}:00` : "—"}</TableCell>}
                  <TableCell className="text-right">
                    {row.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </TableCell>
                  <TableCell className="text-right">{row.orders}</TableCell>
                  <TableCell className="text-right">{row.visitors.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{row.conversionRate.toFixed(2)}%</TableCell>
                  <TableCell className="text-right">{row.cancelledOrders}</TableCell>
                  <TableCell className="text-right">{row.buyers}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={handleImport} disabled={importing}>
            {importing ? "Importando..." : `Importar ${data.length} linhas`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
