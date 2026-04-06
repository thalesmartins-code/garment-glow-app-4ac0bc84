

## Plano: Melhorar layout do card de Publicidade + Corrigir build errors

### 1. Corrigir erros de build (linhas 1726+)

O arquivo `MercadoLivre.tsx` tem JSX duplicado/quebrado a partir da linha 1726. O bloco `</TabsContent>` até o final do arquivo (1726-1734) precisa ser corrigido — removendo código residual e garantindo o fechamento correto das tags.

### 2. Redesign do card de Publicidade

Transformar o card atual (lista vertical simples) em um layout mais rico:

**Destaque no topo:**
- **Gasto total** e **ROAS** exibidos como valores grandes (text-lg/text-xl font-bold) lado a lado em 2 colunas, com labels menores acima
- Cores condicionais no ROAS: verde se >= 3, amarelo se >= 1.5, vermelho se < 1.5

**Mini sparkline:**
- Usar `recharts` `<AreaChart>` compacto (altura ~40px) abaixo dos destaques, mostrando a evolução do ROAS nos últimos dias do período
- Sem eixos, sem legendas — apenas a linha com gradiente sutil

**Métricas secundárias:**
- Receita atribuída, Impressões, Cliques, Pedidos atribuídos, CTR, CPC médio organizados em grid 2x3 (grid-cols-2) com texto compacto

### 3. Dados para sparkline

O hook `useMLAds` já retorna `daily` (array de `AdsDailyStat` com campo `roas`). Será necessário voltar a destructurar `daily` do hook (renomeado como `adsDaily`) para alimentar o sparkline.

### Arquivos editados

- `src/pages/MercadoLivre.tsx` — corrigir build errors + redesign do card de Publicidade com sparkline e layout em destaque

