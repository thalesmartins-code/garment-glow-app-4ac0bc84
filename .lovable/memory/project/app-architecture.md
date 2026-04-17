---
name: app-architecture
description: App é 100% API — sem ambiente de planilha. Rota raiz redireciona para /api.
type: feature
---
O aplicativo opera exclusivamente no ambiente "Marketplaces via API" (`/api/*`). A rota raiz `/` redireciona automaticamente para `/api` e `/perfil` redireciona para `/api/perfil`. O hub seletor `/` e todo o ambiente legado `/sheets/*` foram removidos. Não há mais divisão hub/sheets/api: existe apenas `/api`. Transições entre páginas usam framer-motion.
