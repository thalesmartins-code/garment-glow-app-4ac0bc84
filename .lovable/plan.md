

## Tela de Seleção de Ambiente

### Visão geral
Criar uma tela hub após o login onde o usuário escolhe entre dois ambientes: **Google Sheets** (Dashboard, Vendas, Importação, Sellers, Usuários) e **Mercado Livre API** (Vendas, Estoque, Anúncios, Pedidos, Publicidade, Integrações). Cada card leva ao respectivo ambiente com sua sidebar e layout próprios.

### Mudanças

**1. Nova página `AppSelector.tsx`**
- Dois cards grandes lado a lado (responsivos)
- Card "Google Sheets": ícone de planilha, título, descrição dos módulos, navega para `/sheets`
- Card "Mercado Livre": ícone ML, título, descrição dos módulos, navega para `/mercado-livre`
- Header mínimo com logo, nome do usuário e botão de sair

**2. Atualizar rotas em `App.tsx`**
- Rota `/` renderiza `AppSelector` (dentro de `ProtectedRoute`)
- Mover rotas do ambiente Google Sheets para prefixo `/sheets` (Dashboard em `/sheets`, Vendas em `/sheets/vendas-diarias`, etc.)
- Manter rotas ML em `/mercado-livre/*` como estão
- Rota `/perfil` e `/configuracoes` acessíveis de ambos os ambientes

**3. Atualizar `MainSidebar.tsx`**
- Ajustar paths para o novo prefixo `/sheets`
- Adicionar item de rodapé "Voltar ao painel" apontando para `/` (mesmo padrão do ML sidebar)

**4. Atualizar `routeMeta.ts` e `roleAccess.ts`**
- Atualizar todas as entradas com o novo prefixo `/sheets`

**5. Atualizar `Login.tsx`**
- Redirect após login vai para `/` (já é o padrão, sem mudança necessária)

**6. Atualizar `MainAppLayout.tsx`**
- Sem mudanças estruturais, apenas serve as rotas sob `/sheets`

### Detalhes técnicos

```text
/                        → AppSelector (hub)
/sheets                  → Dashboard (MainAppLayout)
/sheets/vendas-diarias   → Vendas
/sheets/importacao       → Importação
/sheets/sellers          → Sellers
/sheets/usuarios         → Usuários
/sheets/configuracoes    → Configurações
/sheets/integracoes      → Integrações (Google Sheets)
/perfil                  → Perfil (acessível de qualquer ambiente)
/mercado-livre           → ML Vendas (MercadoLivreLayout)
/mercado-livre/estoque   → ML Estoque
...
```

O `AppSelector` terá um layout simples centrado, sem sidebar, com dois cards clicáveis estilizados com gradientes e ícones.

