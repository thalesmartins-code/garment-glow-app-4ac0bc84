

## Nova animação de carregamento entre páginas

Substituir o spinner (`Loader2` girando) que aparece em tela cheia ao trocar de página por uma animação do **logo do app (`AreaChart`)** com efeito de pulse + glow suave, mantendo a identidade visual minimalista do sistema.

### Visual proposto

```text
┌──────────────────────────────┐
│                              │
│         ╭────────╮           │
│         │   📊   │  ← ícone gradiente
│         ╰────────╯              pulsando (scale + opacity)
│                                 com halo/glow expandindo
│      Carregando...              (texto sutil opcional)
│                              │
└──────────────────────────────┘
```

- Ícone `AreaChart` dentro de um container `rounded-xl bg-gradient-primary shadow-glow` (mesmo estilo do login).
- Animação combinada: `scale 1 → 1.08 → 1` + `opacity 0.7 → 1 → 0.7`, loop de ~1.6s, `ease-in-out`.
- Halo: pseudo-elemento com `bg-primary/30` que expande (scale 1 → 1.6) e fade-out (opacity 0.5 → 0), loop sincronizado.
- Texto "Carregando..." em `text-xs text-muted-foreground` com fade pulsante leve.
- Respeita `prefers-reduced-motion`: cai para fade simples sem scale.

### Arquivos afetados

1. **`src/components/ui/PageLoader.tsx`** *(novo)* — componente reutilizável com o logo pulsante e halo. Recebe `label?: string` opcional.
2. **`tailwind.config.ts`** — adicionar keyframes `logo-pulse` e `logo-halo` + animations correspondentes (não conflitam com as existentes).
3. **`src/components/auth/ProtectedRoute.tsx`** — substituir bloco do `Loader2` por `<PageLoader />`.
4. **`src/components/auth/RoleRoute.tsx`** — substituir bloco do `Loader2` por `<PageLoader />`.
5. **`src/App.tsx`** — substituir o fallback do `<Suspense>` (atual `animate-spin rounded-full border-b-2`) por `<PageLoader />`.

### Fora do escopo (mantidos como estão)

- Spinners dentro de botões (Salvar, Atualizar, Sincronizar).
- Spinners internos de cards (AuditLog, MLProdutos, MLEstoque, etc.).
- Loader do modal de sincronização histórica.

