

## Plan: Botão expansível com receita por marketplace abaixo do card Receita Total

### O que será feito
Quando "Todos" estiver selecionado, um pequeno botão (ícone chevron) aparecerá abaixo do card "Receita Total" no header. Ao clicar, uma linha de mini-cards se expande mostrando a receita total de cada marketplace individual, cada um com a cor temática do respectivo marketplace.

### Detalhes técnicos

**Arquivo:** `src/pages/MercadoLivre.tsx`

1. Criar um `useMemo` `perMarketplaceRevenue` que calcula a receita total de cada marketplace individualmente (ML real + mocks dos demais), retornando array com `{ id, name, icon, color, revenue }`.

2. Adicionar estado `showMpBreakdown` (boolean, default false).

3. No bloco do header (linhas ~830-843), abaixo do `<div className="w-72">` que contém o KPICard de Receita Total, adicionar condicionalmente (quando `isAll`):
   - Um botão pequeno centralizado com ícone `ChevronDown`/`ChevronUp` que alterna `showMpBreakdown`.
   - Quando expandido, renderizar um grid de 4 mini-cards (um por marketplace), cada um com:
     - Fundo em gradiente usando a cor do marketplace (amarelo/âmbar para ML, laranja para Amazon, laranja-vermelho para Shopee, azul para Magalu).
     - Ícone do marketplace (Handshake, ShoppingBag, Store, Building2).
     - Nome abreviado e valor formatado em BRL.
     - Estilo compacto (texto pequeno, padding reduzido).

4. Os mini-cards usarão as mesmas cores definidas em `MarketplaceContext` (`from-yellow-500 to-amber-500`, etc.) aplicadas como fundo com opacidade.

