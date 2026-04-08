import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Star, ThumbsUp, ThumbsDown, Minus, ShieldCheck,
  Clock, MessageSquare, Plug, RefreshCw, Info, Check,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { KPICard } from "@/components/dashboard/KPICard";
import { MLPageHeader } from "@/components/mercadolivre/MLPageHeader";
import { useMLStore } from "@/contexts/MLStoreContext";
import { useMLReputation } from "@/hooks/useMLReputation";
import {
  getMockFeedbackDaily,
  getMockFeedbackEntries,
  type ReputationLevel,
  type FeedbackEntry,
} from "@/data/reputacaoMockData";

const pctFmt = (v: number) => `${v.toFixed(1)}%`;

const LEVEL_CONFIG: Record<ReputationLevel, { label: string; color: string; bg: string; border: string }> = {
  green:       { label: "Verde",       color: "text-emerald-600", bg: "bg-emerald-500/15", border: "border-emerald-500/30" },
  light_green: { label: "Verde Claro", color: "text-teal-600",    bg: "bg-teal-500/15",    border: "border-teal-500/30"   },
  yellow:      { label: "Amarelo",     color: "text-amber-600",   bg: "bg-amber-500/15",   border: "border-amber-500/30"  },
  orange:      { label: "Laranja",     color: "text-orange-600",  bg: "bg-orange-500/15",  border: "border-orange-500/30" },
  red:         { label: "Vermelho",    color: "text-red-600",     bg: "bg-red-500/15",     border: "border-red-500/30"    },
};

const LEVEL_STEPS: ReputationLevel[] = ["red", "orange", "yellow", "light_green", "green"];

function ratingBadge(r: FeedbackEntry["rating"]) {
  if (r === "positive") return (
    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1">
      <ThumbsUp className="w-3 h-3" /> Positivo
    </Badge>
  );
  if (r === "neutral") return (
    <Badge className="bg-gray-500/15 text-gray-500 border-gray-500/30 gap-1">
      <Minus className="w-3 h-3" /> Neutro
    </Badge>
  );
  return (
    <Badge className="bg-red-500/15 text-red-600 border-red-500/30 gap-1">
      <ThumbsDown className="w-3 h-3" /> Negativo
    </Badge>
  );
}

function NotConnected() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Plug className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold">Mercado Livre não conectado</h2>
        <p className="text-muted-foreground text-sm">Conecte sua conta para acessar os dados de reputação.</p>
        <Button asChild><Link to="/api/integracoes">Conectar conta</Link></Button>
      </div>
    </div>
  );
}

export default function MLReputacao() {
  const { stores, selectedStore } = useMLStore();
  const { reputation: realRep, mockReputation, isRealData, loading: repLoading, refresh } = useMLReputation();

  const connected = stores.length > 0;
  const storeId = selectedStore !== "all" && selectedStore ? selectedStore : stores[0]?.ml_user_id ?? "default";

  // Use real data when available, mock as fallback
  const reputation = useMemo(() => {
    if (realRep) {
      return {
        level: realRep.level,
        levelLabel: realRep.levelLabel,
        transactions_completed: realRep.transactions_completed,
        positive_rating: realRep.positive_rating !== null ? realRep.positive_rating * 100 : mockReputation.positive_rating,
        neutral_rating: realRep.neutral_rating !== null ? realRep.neutral_rating * 100 : mockReputation.neutral_rating,
        negative_rating: realRep.negative_rating !== null ? realRep.negative_rating * 100 : mockReputation.negative_rating,
        claims_rate: realRep.claims_rate !== null ? realRep.claims_rate * 100 : mockReputation.claims_rate,
        delayed_handling_rate: realRep.delayed_handling_rate !== null ? realRep.delayed_handling_rate * 100 : mockReputation.delayed_handling_rate,
        cancellation_rate: realRep.cancellation_rate !== null ? realRep.cancellation_rate * 100 : mockReputation.cancellation_rate,
        is_power_seller: !!realRep.power_seller_status,
        power_seller_status: realRep.power_seller_status,
        response_time_hours: mockReputation.response_time_hours,
      };
    }
    return { ...mockReputation, power_seller_status: null as string | null };
  }, [realRep, mockReputation]);

  const feedbackDaily = useMemo(() => getMockFeedbackDaily(storeId, 30), [storeId]);
  const feedbackEntries = useMemo(() => getMockFeedbackEntries(storeId, 20), [storeId]);

  const levelCfg = LEVEL_CONFIG[reputation.level];
  const levelIdx = LEVEL_STEPS.indexOf(reputation.level);

  const chartData = feedbackDaily.map((d) => ({
    date: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
    Positivo: d.positive,
    Neutro: d.neutral,
    Negativo: d.negative,
  }));

  if (!connected) return <NotConnected />;

  return (
    <div className="space-y-6 -mt-8">

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <MLPageHeader title="Reputação" lastUpdated={null} />
          <Badge className={`${levelCfg.bg} ${levelCfg.color} ${levelCfg.border} text-sm font-semibold px-3 py-1`}>
            <Star className="w-3.5 h-3.5 mr-1" /> {levelCfg.label}
          </Badge>
          {reputation.is_power_seller && (
            <Badge className="bg-violet-500/15 text-violet-600 border-violet-500/30 gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {reputation.power_seller_status === "platinum" ? "MercadoLíder Platinum" :
               reputation.power_seller_status === "gold" ? "MercadoLíder Gold" : "MercadoLíder"}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isRealData ? (
            <Badge variant="outline" className="text-xs gap-1.5 text-emerald-600 border-emerald-500/30 cursor-default">
              <Check className="w-3 h-3" /> Dados reais
            </Badge>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs gap-1.5 text-muted-foreground cursor-help">
                  <Info className="w-3 h-3" /> Dados simulados
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Conecte uma loja para ver dados reais da API</TooltipContent>
            </Tooltip>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={repLoading}
            onClick={async () => { await refresh(); }}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${repLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Reputation thermometer */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Termômetro de reputação</p>
          <div className="flex gap-1.5">
            {LEVEL_STEPS.map((lvl, i) => {
              const cfg = LEVEL_CONFIG[lvl];
              const isActive = i <= levelIdx;
              const isCurrent = lvl === reputation.level;
              return (
                <Tooltip key={lvl}>
                  <TooltipTrigger asChild>
                    <div
                      className={`flex-1 h-5 rounded-md transition-all cursor-default ${
                        isCurrent
                          ? `${cfg.bg} border-2 ${cfg.border} shadow-sm`
                          : isActive
                          ? `${cfg.bg} border ${cfg.border} opacity-60`
                          : "bg-muted border border-border opacity-30"
                      }`}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{cfg.label}{isCurrent ? " (atual)" : ""}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-muted-foreground">Vermelho</span>
            <span className="text-[10px] text-muted-foreground">Verde</span>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Avaliações positivas"
          value={pctFmt(reputation.positive_rating)}
          variant="minimal"
          iconClassName="bg-success/10 text-success"
          size="compact"
          icon={<ThumbsUp className="w-4 h-4" />}
          subtitle={`${reputation.transactions_completed.toLocaleString("pt-BR")} transações`}
        />
        <KPICard
          title="Avaliações negativas"
          value={pctFmt(reputation.negative_rating)}
          variant="minimal"
          iconClassName={reputation.negative_rating < 2 ? "bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)]" : "bg-destructive/10 text-destructive"}
          size="compact"
          icon={<ThumbsDown className="w-4 h-4" />}
          subtitle="Últimas transações"
        />
        <KPICard
          title="Taxa de reclamações"
          value={pctFmt(reputation.claims_rate)}
          variant="minimal"
          iconClassName={reputation.claims_rate < 1 ? "bg-success/10 text-success" : "bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)]"}
          size="compact"
          icon={<MessageSquare className="w-4 h-4" />}
          subtitle="Meta ML: abaixo de 1%"
        />
        <KPICard
          title="Tempo de resposta"
          value={`${reputation.response_time_hours}h`}
          variant="minimal"
          iconClassName={reputation.response_time_hours <= 12 ? "bg-success/10 text-success" : "bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)]"}
          size="compact"
          icon={<Clock className="w-4 h-4" />}
          subtitle="Tempo médio"
        />
      </div>

      {/* Rates breakdown */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Cancelamentos", value: reputation.cancellation_rate, max: 2 },
          { label: "Entrega atrasada", value: reputation.delayed_handling_rate, max: 5 },
          { label: "Avaliações neutras", value: reputation.neutral_rating, max: 5 },
        ].map(({ label, value, max }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground font-medium">{label}</p>
              <p className="text-2xl font-bold mt-1">{pctFmt(value)}</p>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${value / max < 0.5 ? "bg-emerald-500" : value / max < 0.8 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Meta: abaixo de {max}%</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <div className="px-4 pt-4 pb-3">
          <span className="text-sm font-medium text-foreground">Avaliações — últimos 30 dias</span>
        </div>
        <CardContent className="px-4 pb-2 pt-0">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} />
              <RechartsTooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
              />
              
              <Bar dataKey="Positivo" fill="hsl(var(--success))" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Neutro" fill="hsl(var(--muted-foreground))" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Negativo" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Feedback list */}
      <Card>
        <div className="px-4 pt-4 pb-3">
          <span className="text-sm font-medium text-foreground">Últimas avaliações</span>
        </div>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {feedbackEntries.slice(0, 10).map((entry) => (
              <div key={entry.id} className="px-6 py-3 flex items-start gap-3">
                <div className="flex-shrink-0 pt-0.5">{ratingBadge(entry.rating)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{entry.comment}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.item_title}</p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {format(parseISO(entry.date), "dd/MM/yy")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
