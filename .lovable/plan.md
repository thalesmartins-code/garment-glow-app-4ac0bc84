

## Simplificar cabeçalho da página de Vendas

### Problema
O `MLPageHeader` na página de Vendas exibe informações redundantes (marketplace selecionado, vendedor, última sincronização) que já são visíveis no `SellerMarketplaceBar` e no header geral do layout.

### Plano

**1. Simplificar o `MLPageHeader`** para exibir apenas:
- Título da página ("Vendas", "Estoque", etc.)
- Data da última sincronização em formato discreto (inline, ao lado do título ou como texto pequeno abaixo)
- Slot para `children` (botões de ação)

Remover:
- Ícone do marketplace (quadrado colorido com ícone)
- Texto "Todos os marketplaces" / nome do marketplace
- Texto "Vendedor: NOME"
- Query ao `ml_user_cache` para buscar nickname

**2. Layout resultante** — o header ficará mais compacto, com apenas uma linha:

```text
Vendas                                    [children/botões]
Última sinc: 01/04/2026, 12:59:02
```

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/mercadolivre/MLPageHeader.tsx` | Remover ícone, marketplace name, nickname, query ao supabase. Manter título + última sinc + children |

Todas as 6 páginas que usam `MLPageHeader` (Vendas, Estoque, Anúncios, Pedidos, Sincronizações) se beneficiam automaticamente da simplificação.

