

# Mudanca de Paleta de Cores para Tema Financeiro

## Objetivo
Substituir a paleta atual (rose gold / moda) por uma paleta corporativa financeira baseada em **azul escuro (navy)** com acentos em **verde esmeralda**, transmitindo confianca, profissionalismo e solidez.

## Nova Paleta

| Elemento | Atual (Rose Gold) | Novo (Financeiro) |
|---|---|---|
| Accent | Rosa dourado (HSL 15 45% 65%) | Azul navy (HSL 217 70% 45%) |
| Sidebar BG | Cinza escuro quente | Azul muito escuro |
| Gradient principal | Rosa para rosa escuro | Azul navy para azul royal |
| Shadow glow | Rosa translucido | Azul translucido |
| Success | Verde (mantido) | Verde (mantido) |

## Arquivos a Alterar

### 1. `src/index.css` - Variaveis CSS (arquivo principal)
- Trocar comentario do design system de "Fashion Store" para "Financial Management SaaS"
- **:root (light mode)**:
  - `--accent`: de `15 45% 65%` para `217 70% 45%` (azul corporativo)
  - `--ring`: de `15 45% 65%` para `217 70% 45%`
  - `--sidebar-background`: de `24 10% 8%` para `217 50% 10%`
  - `--sidebar-primary`: de `15 45% 65%` para `217 70% 45%`
  - `--sidebar-accent`: de `24 10% 15%` para `217 40% 18%`
  - `--sidebar-border`: de `24 10% 18%` para `217 30% 22%`
  - `--sidebar-ring`: de `15 45% 65%` para `217 70% 45%`
  - `--gradient-rose` renomear para `--gradient-primary`: gradiente azul navy
  - `--shadow-glow`: tom azul translucido
- **Dark mode**: mesmas mudancas adaptadas para tons escuros

### 2. `src/index.css` - Classes utilitarias
- Renomear `.text-gradient` para usar novo gradiente
- Renomear `.bg-gradient-rose` para `.bg-gradient-primary` (manter `.bg-gradient-rose` como alias para nao quebrar)
- Atualizar gradientes para tons azuis

### 3. `tailwind.config.ts`
- Sem alteracoes estruturais necessarias (ja usa variaveis CSS)

### 4. Componentes que usam `bg-gradient-rose` e `shadow-glow` (atualizacao de referencia)
Arquivos que referenciam a classe antiga:
- `src/components/dashboard/MetricCard.tsx` - trocar `bg-gradient-rose` por `bg-gradient-primary`
- `src/components/dashboard/RecentSales.tsx` - trocar `bg-gradient-rose`
- `src/components/chat/FloatingChat.tsx` - trocar `bg-gradient-rose` (4 ocorrencias)
- `src/components/layout/Sidebar.tsx` - trocar `bg-gradient-rose`
- `src/pages/FinanceiroDashboard.tsx` - verificar e atualizar se necessario
- Demais paginas que usem a classe

### 5. Graficos (`src/pages/FinanceiroDashboard.tsx`, `FinanceiroDRE.tsx`, `FinanceiroDFC.tsx`)
- Atualizar cores dos graficos (bars, areas, pies) de tons rosados para tons azuis/verdes corporativos

## Resultado Esperado
- Sidebar em azul escuro profissional
- Gradientes e botoes de destaque em azul corporativo
- Graficos com paleta azul/verde/cinza
- Visual coerente com um sistema financeiro serio e confiavel

