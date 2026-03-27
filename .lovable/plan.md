

## Plan: Animação suave com framer-motion nos mini-cards

### O que será feito
Substituir a renderização condicional simples dos mini-cards por `AnimatePresence` e `motion.div` do framer-motion, adicionando animação de expansão/fade suave ao abrir e fechar.

### Detalhes técnicos

**Arquivo:** `src/pages/MercadoLivre.tsx`

1. Importar `motion, AnimatePresence` de `framer-motion`.

2. Envolver o grid dos mini-cards (linhas 873-888) com `<AnimatePresence>` e substituir a `<div>` do grid por `<motion.div>` com:
   - `initial={{ opacity: 0, height: 0 }}`
   - `animate={{ opacity: 1, height: "auto" }}`
   - `exit={{ opacity: 0, height: 0 }}`
   - `transition={{ duration: 0.3, ease: "easeInOut" }}`
   - `className` com `overflow-hidden` adicionado

3. Cada mini-card individual também será `<motion.div>` com stagger via `transition.delay` baseado no índice (`index * 0.05`), animando de `scale: 0.8, opacity: 0` para `scale: 1, opacity: 1`.

