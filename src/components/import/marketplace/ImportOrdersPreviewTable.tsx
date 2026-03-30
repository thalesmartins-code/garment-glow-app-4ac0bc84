import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ParsedOrderRow } from "@/utils/marketplaceParsers";

interface Props {
  data: ParsedOrderRow[];
  onImportComplete: () => void;
}

export function ImportOrdersPreviewTable({ data, onImportComplete }: Props) {
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!data.length) return;
    setImporting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const rows = data.map(r => ({
        user_id: user.id,
        order_id: r.orderId,
        order_status: r.orderStatus,
        order_date: r.orderDate,
        sku: r.sku,
        product_name: r.productName,
        variation: r.variation,
        agreed_price: r.agreedPrice,
        quantity: r.quantity,
        subtotal: r.subtotal,
      }));

      // Upsert in batches of 500
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const { error } = await supabase
          .from("shopee_orders" as any)
          .upsert(batch as any, { onConflict: "user_id,order_id,sku,variation" });
        if (error) throw error;
      }

      toast.success(`${data.length} pedidos importados com sucesso!`);
      onImportComplete();
    } catch (err: any) {
      toast.error(err.message || "Erro ao importar pedidos.");
    } finally {
      setImporting(false);
    }
  };

  const cancelledCount = data.filter(r => r.orderStatus === "Cancelado").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">
          Preview — {data.length} linhas de pedido
        </CardTitle>
        <div className="flex gap-2">
          {cancelledCount > 0 && (
            <Badge variant="outline" className="text-destructive border-destructive/30">
              {cancelledCount} cancelados
            </Badge>
          )}
          <Badge variant="secondary">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Pronto para importar
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-80 overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Variação</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 50).map((row, i) => (
                <TableRow key={i} className={row.orderStatus === "Cancelado" ? "opacity-50" : ""}>
                  <TableCell className="whitespace-nowrap font-mono text-xs">{row.orderId}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{row.productName}</TableCell>
                  <TableCell className="max-w-[120px] truncate">{row.variation || "—"}</TableCell>
                  <TableCell className="text-right">
                    {row.agreedPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </TableCell>
                  <TableCell className="text-right">{row.quantity}</TableCell>
                  <TableCell className="text-right">
                    {row.subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.orderStatus === "Cancelado" ? "destructive" : "secondary"} className="text-xs">
                      {row.orderStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={handleImport} disabled={importing}>
            {importing ? "Importando..." : `Importar ${data.length} pedidos`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
