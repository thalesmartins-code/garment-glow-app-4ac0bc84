import React from "react";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { ImportResult } from "@/types/import";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface DataPreviewProps {
  result: ImportResult;
  maxRows?: number;
}

export function DataPreview({ result, maxRows = 10 }: DataPreviewProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  const previewData = result.data.slice(0, maxRows);
  const hasMoreRows = result.data.length > maxRows;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground">Total de linhas:</span>
          <span className="text-sm font-medium">{result.totalRows}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-success/10 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <span className="text-sm text-muted-foreground">Válidas:</span>
          <span className="text-sm font-medium text-success">{result.validRows}</span>
        </div>
        {result.errors.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 rounded-lg">
            <XCircle className="w-4 h-4 text-destructive" />
            <span className="text-sm text-muted-foreground">Com erros:</span>
            <span className="text-sm font-medium text-destructive">{result.errors.length}</span>
          </div>
        )}
      </div>

      {/* Errors List */}
      {result.errors.length > 0 && (
        <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">
              Erros encontrados ({result.errors.length})
            </span>
          </div>
          <ScrollArea className="max-h-32">
            <ul className="space-y-1">
              {result.errors.slice(0, 10).map((error, idx) => (
                <li key={idx} className="text-sm text-destructive/80">
                  <span className="font-medium">Linha {error.line}:</span> {error.message}
                </li>
              ))}
              {result.errors.length > 10 && (
                <li className="text-sm text-destructive/60 italic">
                  ... e mais {result.errors.length - 10} erros
                </li>
              )}
            </ul>
          </ScrollArea>
        </div>
      )}

      {/* Data Preview Table */}
      {result.data.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Marketplace</TableHead>
                  <TableHead className="font-semibold">Ano</TableHead>
                  <TableHead className="font-semibold">Mês</TableHead>
                  <TableHead className="font-semibold">Dia</TableHead>
                  <TableHead className="font-semibold text-right">Venda Bruta Aprovada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((sale, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{sale.marketplace}</TableCell>
                    <TableCell>{sale.ano}</TableCell>
                    <TableCell>{monthNames[sale.mes - 1]}</TableCell>
                    <TableCell>{sale.dia}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(sale.vendaTotal)}
                    </TableCell>
                  </TableRow>
                ))}
                {hasMoreRows && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground italic py-3"
                    >
                      ... e mais {result.data.length - maxRows} registros
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      )}

      {/* Status Badge */}
      <div
        className={cn(
          "flex items-center gap-2 p-3 rounded-lg",
          result.success
            ? "bg-green-500/10 border border-green-500/20"
            : "bg-yellow-500/10 border border-yellow-500/20"
        )}
      >
        {result.success ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-green-600">
              Arquivo válido! Pronto para importar.
            </span>
          </>
        ) : (
          <>
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-medium text-yellow-600">
              {result.validRows > 0
                ? `${result.validRows} registros válidos podem ser importados. Corrija os erros para importar todos.`
                : "Nenhum registro válido. Corrija os erros e tente novamente."}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
