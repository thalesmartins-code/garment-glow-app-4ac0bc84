

## Refatoração Visual — Página de Vendas (MercadoLivre.tsx)

A página principal de Vendas (`/api`) está funcional mas visualmente densa, com espaçamento inconsistente e elementos sem hierarquia clara. A proposta é torná-la mais limpa, moderna e minimalista sem alterar funcionalidade.

### Mudanças Planejadas

**1. Header da página — layout simplificado**
- Remover o KPICard "Receita Total" flutuante do header (desktop) — fica redundante com o grid de KPIs abaixo
- Mover título "Vendas" + última sinc e controles (filtro de período, seletor de loja) para uma barra horizontal única e limpa
- Espaçamento mais generoso entre título e controles

**2. KPI Cards — visual mais leve**
- Reduzir o grid de 6 KPIs compactos para um layout mais respirado: `grid-cols-3 lg:grid-cols-6` com `gap-3`
- Remover bordas coloridas de variantes (success, purple, orange) — usar apenas ícone colorido + texto como diferenciador
- Ajustar `KPICard` componente: adicionar variante `"minimal"` que remove `bg-*` tinted backgrounds, mantendo apenas `bg-card shadow-sm`
- Tipografia: valor principal `text-xl font-semibold` (em vez de bold), label `text-xs uppercase tracking-wider text-muted-foreground`

**3. Gráficos — cards mais limpos**
- Remover `CardHeader` pesado nos gráficos, usar título inline menor (`text-sm font-medium`) com menos padding
- Reduzir altura dos gráficos de `320px` para `280px`
- Tooltip com `rounded-xl shadow-lg` mais suave
- Grid lines mais sutis (opacidade 0.3)

**4. Tabelas (Venda/Hora + TopProducts)**
- Padding reduzido nas cards que envolvem tabelas
- Headers de tabela com `text-xs uppercase tracking-wider` para consistência
- Hover rows mais suave: `bg-muted/40`

**5. Barra de Revenue by Marketplace**
- Simplificar visual: remover gradientes pesados das barras, usar cor sólida com opacidade
- Tipografia mais uniforme

**6. Sync progress bar + empty states**
- Progress bar mais sutil: `h-0.5` em vez de usar Card border
- Empty states com ícone menor e texto mais enxuto

### Arquivos Editados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/dashboard/KPICard.tsx` | Adicionar variante `minimal`, ajustar tipografia e espaçamento padrão |
| `src/pages/MercadoLivre.tsx` | Reestruturar layout do header, remover KPI flutuante, ajustar grids, usar variante minimal nos KPIs, refinar cards de gráfico |
| `src/components/mercadolivre/MLPageHeader.tsx` | Refinar espaçamento e tipografia |
| `src/index.css` | Adicionar tokens CSS para sombras mais suaves (`--shadow-card`, `--shadow-sm`) |
| `src/components/ui/card.tsx` | Ajustar sombra padrão de `shadow-md` para `shadow-sm` para visual mais leve |

### Resultado Esperado

```text
┌──────────────────────────────────────────────────┐
│  Vendas              [Loja] [Hoje ▾] [Sinc ↻]   │  ← header limpo, uma linha
│  Última sinc: 02/04 11:20                        │
├──────────────────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌────┐│
│  │R$12k│ │ 245 │ │R$49 │ │1.2k │ │ 89  │ │2.1%││  ← KPIs minimal, fundo branco
│  │Rec. │ │Vendas│ │Ticket│ │Visit│ │Comp.│ │Conv││
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └────┘│
│                                                  │
│  ┌──────────────────────────────────────────────┐│
│  │ Venda / Hora — Hoje                          ││  ← gráfico clean, menos padding
│  │ [chart 280px]                                ││
│  └──────────────────────────────────────────────┘│
│                                                  │
│  ┌──────────────────┐ ┌─────────────────────────┐│
│  │ Venda / Hora     │ │ Top Produtos            ││
│  │ [tabela]         │ │ [tabela]                ││
│  └──────────────────┘ └─────────────────────────┘│
└──────────────────────────────────────────────────┘
```

### Detalhes Técnicos

- A variante `minimal` no KPICard usa `bg-card shadow-sm border-0` sem tinted backgrounds, com ícone colorido como único diferenciador
- Cards globais mudam de `shadow-md` para `shadow-sm` para visual mais flat
- Nenhuma funcionalidade é alterada — apenas CSS/layout
- Manter responsividade existente (mobile KPI card, grid breakpoints)

