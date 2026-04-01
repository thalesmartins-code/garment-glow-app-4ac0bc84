

## Dashboard de Venda por Hora — Exemplos visuais de cada formato

O usuário quer ver exemplos antes de escolher. Vou criar uma nova página dedicada (`/api/vendas-hora`) com **4 abas (tabs)** mostrando cada formato lado a lado, para que o usuário possa comparar e escolher o preferido.

### Formatos apresentados

**Tab 1 — Heatmap (Hora × Dia)**
```text
         Seg   Ter   Qua   Qui   Sex   Sáb   Dom
  00h    ░░    ░░    ░░    ░░    ░░    ░░    ░░
  06h    ░░    ▒▒    ░░    ▒▒    ░░    ░░    ░░
  10h    ▓▓    ▓▓    ██    ▓▓    ██    ▒▒    ░░
  14h    ██    ██    ██    ██    ██    ▓▓    ▒▒
  20h    ▓▓    ▒▒    ▓▓    ▒▒    ▒▒    ░░    ░░
```
Grid 24 linhas × 7 colunas, cor por intensidade de receita. Tooltip ao hover com valor.

**Tab 2 — Barras empilhadas por marketplace**
```text
  00h  ░
  06h  ████
  10h  ████████████████
  14h  ████████████████████████
  20h  ██████████████
```
Cada barra tem segmentos coloridos por marketplace.

**Tab 3 — Radar/Polar**
Gráfico radial com 24 eixos (horas), preenchido com área. Mostra o "formato" do dia de vendas.

**Tab 4 — Heatmap + Tabela**
Heatmap no topo + tabela `HourlySalesTable` abaixo com os dados detalhados.

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/pages/mercadolivre/VendasPorHora.tsx` | Criar — página com 4 tabs, cada uma renderizando um formato diferente |
| `src/components/mercadolivre/HourlyHeatmap.tsx` | Criar — componente heatmap (hora × dia da semana) |
| `src/components/mercadolivre/HourlyStackedBars.tsx` | Criar — barras empilhadas por hora/marketplace |
| `src/components/mercadolivre/HourlyRadar.tsx` | Criar — radar chart 24h usando Recharts |
| `src/components/layout/ApiSidebar.tsx` | Adicionar item "Venda/Hora" com ícone Clock |
| `src/App.tsx` | Adicionar rota `/api/vendas-hora` |

### Detalhes técnicos

- Recharts para barras empilhadas e radar (já instalado)
- Heatmap: CSS grid puro com células coloridas via opacidade dinâmica (sem lib extra)
- Dados: reutilizar `HourlyBreakdown` do `MarketplaceContext` + mock data existente (`getMarketplaceHourlyData`, `getAllMarketplaceMockHourly`)
- Filtro de período no topo da página (reutilizar lógica de QUICK_RANGES)
- Framer-motion para animações de entrada
- Após o usuário escolher o formato preferido, removeremos os outros e finalizaremos o componente

