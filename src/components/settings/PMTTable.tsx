import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Percent, Equal, CalendarClock, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  DailyPMT,
  getDayOfWeek,
  dayOfWeekShortLabels,
  generateUniformPMTDistribution,
  generateDefaultPMTDistribution,
} from "@/types/settings";

interface PMTTableProps {
  year: number;
  month: number;
  distribution: DailyPMT[];
  targetValue: number;
  onDistributionChange: (distribution: DailyPMT[]) => void;
}

export function PMTTable({
  year,
  month,
  distribution,
  targetValue,
  onDistributionChange,
}: PMTTableProps) {
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  const totalPMT = distribution.reduce((sum, d) => sum + d.pmt, 0);
  const isValid = Math.abs(totalPMT - 100) < 0.01;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const startEditing = (day: number, currentValue: number) => {
    setEditingDay(day);
    setEditingValue(currentValue.toString());
  };

  const commitEdit = (day: number) => {
    const numValue = parseFloat(editingValue.replace(",", "."));
    const newDistribution = distribution.map((d) =>
      d.day === day ? { ...d, pmt: isNaN(numValue) ? 0 : numValue } : d
    );
    onDistributionChange(newDistribution);
    setEditingDay(null);
    setEditingValue("");
  };

  const handleUniform = () => {
    const uniform = generateUniformPMTDistribution(year, month);
    onDistributionChange(uniform);
  };

  const handleWeeklyPattern = () => {
    const weekly = generateDefaultPMTDistribution(year, month);
    onDistributionChange(weekly);
  };

  const calculateDailyTarget = (pmt: number) => {
    return (pmt / 100) * targetValue;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Distribuição de PMT
            </CardTitle>
            <CardDescription className="mt-1">
              Defina a porcentagem da meta para cada dia do mês
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isValid ? (
              <div className="flex items-center gap-1.5 text-sm text-success bg-success/10 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">{totalPMT.toFixed(2)}%</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-sm text-destructive bg-destructive/10 px-3 py-1.5 rounded-full">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">{totalPMT.toFixed(2)}%</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUniform}
            className="flex items-center gap-1.5"
          >
            <Equal className="h-4 w-4" />
            Distribuir Uniformemente
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleWeeklyPattern}
            className="flex items-center gap-1.5"
          >
            <CalendarClock className="h-4 w-4" />
            Padrão Semanal
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[400px] rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-16 text-center">Dia</TableHead>
                <TableHead className="w-20 text-center">Semana</TableHead>
                <TableHead className="w-28 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Percent className="h-3.5 w-3.5" />
                    PMT
                  </div>
                </TableHead>
                <TableHead className="text-right">Meta Calculada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {distribution.map((item) => {
                const dayOfWeek = getDayOfWeek(year, month, item.day);
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const dailyTarget = calculateDailyTarget(item.pmt);
                
                return (
                  <TableRow
                    key={item.day}
                    className={isWeekend ? "bg-muted/30" : ""}
                  >
                    <TableCell className="text-center font-medium">
                      {item.day.toString().padStart(2, "0")}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          isWeekend
                            ? "bg-warning/10 text-warning-foreground dark:bg-warning/20 dark:text-warning"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {dayOfWeekShortLabels[dayOfWeek]}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {editingDay === item.day ? (
                        <Input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => commitEdit(item.day)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit(item.day);
                            if (e.key === "Escape") {
                              setEditingDay(null);
                              setEditingValue("");
                            }
                          }}
                          className="w-20 h-8 text-center mx-auto"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => startEditing(item.day, item.pmt)}
                          className="w-20 h-8 text-center border border-transparent hover:border-primary/50 rounded-md transition-colors cursor-pointer inline-flex items-center justify-center"
                        >
                          {item.pmt.toFixed(2)}%
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {targetValue > 0 ? formatCurrency(dailyTarget) : "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
        
        {!isValid && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              A soma dos PMTs deve ser exatamente 100%. Atualmente: {totalPMT.toFixed(2)}%
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
