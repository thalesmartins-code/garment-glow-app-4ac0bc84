import { useMemo, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MessageCircleQuestion, Clock, CheckCircle2, AlertTriangle,
  Plug, RefreshCw, Info, MessageSquare,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { KPICard } from "@/components/dashboard/KPICard";
import { MLPageHeader } from "@/components/mercadolivre/MLPageHeader";
import { useMLStore } from "@/contexts/MLStoreContext";
import {
  getMockPerguntasSummary,
  getMockPerguntasDailyStats,
  getMockPerguntaEntries,
} from "@/data/perguntasMockData";

function NotConnected() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Plug className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold">Mercado Livre não conectado</h2>
        <p className="text-muted-foreground text-sm">Conecte sua conta para acessar as perguntas dos seus anúncios.</p>
        <Button asChild><Link to="/api/integracoes">Conectar conta</Link></Button>
      </div>
    </div>
  );
}

export default function MLPerguntas() {
  const { stores, selectedStore } = useMLStore();
  const [syncing, setSyncing] = useState(false);

  const connected = stores.length > 0;
  const storeId = selectedStore !== "all" && selectedStore ? selectedStore : stores[0]?.ml_user_id ?? "default";

  const summary = useMemo(() => getMockPerguntasSummary(storeId), [storeId]);
  const dailyStats = useMemo(() => getMockPerguntasDailyStats(storeId, 30), [storeId]);
  const entries = useMemo(() => getMockPerguntaEntries(storeId, 25), [storeId]);

  const pending = useMemo(() => entries.filter((e) => e.status === "unanswered"), [entries]);
  const answered = useMemo(() => entries.filter((e) => e.status === "answered"), [entries]);

  const chartData = dailyStats.map((d) => ({
    date: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
    Total: d.total,
    Respondidas: d.answered,
  }));

  if (!connected) return <NotConnected />;

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MLPageHeader title="Perguntas" lastUpdated={null} />
          {summary.pending > 0 && (
            <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 gap-1">
              <AlertTriangle className="w-3 h-3" /> {summary.pending} pendentes
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs gap-1.5 text-muted-foreground cursor-help">
                <Info className="w-3 h-3" /> Dados simulados
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Integração com a API de perguntas em breve</TooltipContent>
          </Tooltip>
          <Button
            variant="outline"
            size="sm"
            disabled={syncing}
            onClick={() => { setSyncing(true); setTimeout(() => setSyncing(false), 1200); }}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Perguntas pendentes"
          value={String(summary.pending)}
          variant="minimal"
          iconClassName={summary.pending === 0 ? "bg-success/10 text-success" : summary.pending <= 5 ? "bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)]" : "bg-destructive/10 text-destructive"}
          size="compact"
          icon={<MessageCircleQuestion className="w-4 h-4" />}
          subtitle="Aguardando resposta"
        />
        <KPICard
          title="Taxa de resposta"
          value={`${summary.answer_rate.toFixed(1)}%`}
          variant="minimal"
          iconClassName={summary.answer_rate >= 95 ? "bg-success/10 text-success" : "bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)]"}
          size="compact"
          icon={<CheckCircle2 className="w-4 h-4" />}
          subtitle="Últimos 30 dias"
        />
        <KPICard
          title="Tempo médio resposta"
          value={`${summary.avg_response_hours}h`}
          variant="minimal"
          iconClassName={summary.avg_response_hours <= 6 ? "bg-success/10 text-success" : "bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)]"}
          size="compact"
          icon={<Clock className="w-4 h-4" />}
          subtitle="Horas para responder"
        />
        <KPICard
          title="Total de perguntas"
          value={String(summary.total_30d)}
          variant="minimal"
          iconClassName="bg-primary/10 text-primary"
          size="compact"
          icon={<MessageSquare className="w-4 h-4" />}
          subtitle="Últimos 30 dias"
        />
      </div>

      {/* Alert for unanswered > 24h */}
      {summary.unanswered_gt_24h > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-600">
                {summary.unanswered_gt_24h} {summary.unanswered_gt_24h === 1 ? "pergunta sem resposta há mais de 24h" : "perguntas sem resposta há mais de 24h"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Perguntas sem resposta prejudicam sua reputação. Responda o quanto antes.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      <Card>
        <div className="px-4 pt-4 pb-3">
          <span className="text-sm font-medium text-foreground">Volume de perguntas — últimos 30 dias</span>
        </div>
        <CardContent className="px-4 pb-2 pt-0">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradAnswered" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} />
              <RechartsTooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
              />
              <Area dataKey="Total" stroke="hsl(var(--accent))" fill="url(#gradTotal)" strokeWidth={2} />
              <Area dataKey="Respondidas" stroke="hsl(var(--success))" fill="url(#gradAnswered)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Questions list */}
      <Card>
        <div className="px-4 pt-4 pb-3">
          <span className="text-sm font-medium text-foreground">Perguntas</span>
        </div>
        <CardContent className="p-0">
          <Tabs defaultValue="pending">
            <div className="px-6 pt-2 pb-0 border-b border-border">
              <TabsList className="h-9 bg-transparent p-0 gap-4">
                <TabsTrigger
                  value="pending"
                  className="h-9 px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm"
                >
                  Pendentes ({pending.length})
                </TabsTrigger>
                <TabsTrigger
                  value="answered"
                  className="h-9 px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm"
                >
                  Respondidas ({answered.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="pending" className="mt-0">
              {pending.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <CheckCircle2 className="w-10 h-10 opacity-30" />
                  <p className="text-sm">Nenhuma pergunta pendente</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {pending.map((entry) => (
                    <div key={entry.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <p className="text-xs text-muted-foreground truncate">{entry.item_title}</p>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {format(parseISO(entry.date), "dd/MM/yy")}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{entry.question}</p>
                      <Badge className="mt-2 bg-amber-500/15 text-amber-600 border-amber-500/30 text-xs">
                        Aguardando resposta
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="answered" className="mt-0">
              <div className="divide-y divide-border">
                {answered.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <p className="text-xs text-muted-foreground truncate">{entry.item_title}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {entry.hours_to_answer !== null && (
                          <span className="text-xs text-muted-foreground">{entry.hours_to_answer}h</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(entry.date), "dd/MM/yy")}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-foreground">{entry.question}</p>
                    {entry.answer && (
                      <p className="text-sm text-muted-foreground mt-1.5 pl-3 border-l-2 border-border">
                        {entry.answer}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
