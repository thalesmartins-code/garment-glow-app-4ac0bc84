

## Plano: Mover "Receita Total" para a linha do cabeçalho

### O que será feito

Mover o card "Receita Total" da posição centralizada abaixo dos filtros para dentro da linha do cabeçalho/filtros (linhas 809-911), alinhado à direita junto aos botões, ou à esquerda junto ao título — criando uma apresentação integrada.

### Alterações técnicas (`src/pages/MercadoLivre.tsx`)

1. **Remover** o bloco `<div className="max-w-xs mx-auto">` com o KPICard de Receita Total (linhas 928-939).

2. **Inserir** o KPICard de Receita Total dentro do `<div className="flex items-center justify-between">` (linha 809), ao lado do `MLPageHeader`, ficando assim:

```text
┌──────────────────────────────────────────────────────────┐
│  [MLPageHeader: Vendas]   [Receita Total card]   [filtros/botões] │
└──────────────────────────────────────────────────────────┘
```

O card será inserido entre o header e os filtros, com tamanho compacto (`max-w-[200px]`) e sem margens extras, mantendo o estilo `variant="default"`.

