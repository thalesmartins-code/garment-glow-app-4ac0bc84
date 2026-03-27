

## Plano: Destacar card Receita Total com estilo minimalista

### O que muda

Aplicar 3 efeitos sutis ao card de Receita Total no header (desktop) e na versão mobile:

1. **Fundo com gradiente suave** — Gradiente linear de `primary/5` para transparente no card
2. **Tipografia diferenciada** — Valor com cor `primary` e título com `font-semibold`
3. **Glow/sombra colorida** — `shadow` com tom azulado usando `ring` ou `shadow-[0_0_15px_hsl(var(--primary)/0.15)]`

### Arquivo editado

**`src/pages/MercadoLivre.tsx`** — Atualizar o `className` do KPICard de Receita Total:

- Adicionar classes de gradiente: `bg-gradient-to-r from-primary/5 to-transparent`
- Adicionar sombra colorida: `shadow-[0_0_12px_hsl(var(--primary)/0.12)]`
- Adicionar destaque tipográfico: `[&_p]:text-primary` (valor em cor primária) e `[&_span]:font-semibold` (título mais forte)
- Aplicar as mesmas alterações na versão mobile do card

Resultado: destaque visual sutil e consistente com o design system existente, sem adicionar novos componentes ou variantes.

