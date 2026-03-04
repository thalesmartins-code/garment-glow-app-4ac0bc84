// Types for the dashboard data
export interface MarketplaceSales {
  id: string;
  marketplace: string;
  logo: string;
  vendas: number;
  vendaTotal: number;
  vendaAprovadaReal: number;
  pmt: number;
  meta: number;
  metaPercentage: number;
  yoyGrowth: number;
  lastYearTotal: number;
}

export interface DailySale {
  dia: number;
  semana: string;
  pmt: number;
  pmtAcum: number;
  metaVendas: number;
  vendaTotal: number;
  vendaAprovadaReal: number;
  gap: number;
  metaAtingida: number;
  vendaAnoAnterior: number;
  yoyDia: number;
}

export interface DashboardSummary {
  totalVendas: number;
  totalReceita: number;
  pmtGeral: number;
  metaGeral: number;
  metaPercentage: number;
  yoyGrowthGeral: number;
  ticketMedioYoY: number;
  conversionRate: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  marketplaces: MarketplaceSales[];
  lastUpdate: string;
  period: string;
}

// Filter periods available
export type PeriodFilter = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export const periodLabels: Record<PeriodFilter, string> = {
  today: 'Hoje',
  week: 'Esta Semana',
  month: 'Este Mês',
  quarter: 'Trimestre',
  year: 'Este Ano',
  custom: 'Personalizado',
};
