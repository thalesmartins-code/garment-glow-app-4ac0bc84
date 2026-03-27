

## Plano: Destacar "Receita Total" e restaurar "Receita Aprovada"

### O que será feito

1. **Mover "Receita Total" para uma linha própria acima dos demais cards**, centralizado, com destaque minimalista (maior largura, fonte maior ou borda sutil).

2. **Restaurar o card "Receita Aprovada"** na linha inferior junto aos outros 6 cards.

3. **Ajustar o grid inferior** para 7 colunas em telas XL (`xl:grid-cols-7`).

### Alterações técnicas (arquivo: `src/pages/MercadoLivre.tsx`)

- Extrair o KPICard de "Receita Total" do grid atual e colocá-lo acima, dentro de um `div` com `max-w-sm mx-auto` para centralizar.
- Aplicar estilo de destaque minimalista: bordas sutis, padding maior, ou classe customizada no `className` do KPICard (ex: `text-center border shadow-sm`).
- Reintroduzir o KPICard "Receita Aprovada" (variant `success`, ícone `DollarSign`) na posição original dentro do grid.
- Grid inferior passa de `xl:grid-cols-6` para `xl:grid-cols-7` (Receita Aprovada + Qtd. Vendas + Ticket Médio + Visitas Únicas + Compradores + Conversão = 6, mais eventual ajuste).

### Layout resultante

```text
┌─────────────────────────────────────────┐
│         [ Receita Total - destaque ]     │  ← centralizado, linha própria
└─────────────────────────────────────────┘

┌──────┬──────┬──────┬──────┬──────┬──────┐
│Rec.  │Qtd.  │Ticket│Visit.│Compr.│Conv. │  ← 6 cards em linha
│Aprov.│Vendas│Médio │Únicas│      │      │
└──────┴──────┴──────┴──────┴──────┴──────┘
```

