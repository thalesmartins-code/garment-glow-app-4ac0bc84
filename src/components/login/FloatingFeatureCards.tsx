import { motion } from "framer-motion";
import { Package, Award, Trophy, Star, Target } from "lucide-react";

const floatAnimation = (duration: number, delay: number) => ({
  y: [0, -6, 0],
  transition: { duration, repeat: Infinity, ease: "easeInOut" as const, delay },
});

const cardBase =
  "rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] shadow-sm opacity-60";

const fadeScale = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i: number) => ({
    opacity: 0.6,
    scale: 1,
    transition: { duration: 0.8, delay: 1.2 + i * 0.2, ease: "easeOut" as const },
  }),
};

/* ── Estoque ── */
function EstoqueCard() {
  const items = [
    { label: "Camisetas", pct: 82, color: "bg-emerald-400" },
    { label: "Calças", pct: 45, color: "bg-amber-400" },
    { label: "Acessórios", pct: 18, color: "bg-rose-400" },
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Package className="h-3.5 w-3.5 text-white/60" />
        <span className="text-[11px] font-medium text-white/60">Estoque</span>
      </div>
      {items.map((it) => (
        <div key={it.label} className="space-y-0.5">
          <div className="flex justify-between text-[10px] text-white/50">
            <span>{it.label}</span>
            <span>{it.pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${it.color}`}
              initial={{ width: 0 }}
              animate={{ width: `${it.pct}%` }}
              transition={{ duration: 0.8, delay: 1.8 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Ranking de Marcas ── */
function MarcasCard() {
  const brands = [
    { name: "Nike", medal: "🥇", val: "R$ 42k" },
    { name: "Adidas", medal: "🥈", val: "R$ 31k" },
    { name: "Puma", medal: "🥉", val: "R$ 18k" },
  ];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 mb-1">
        <Award className="h-3.5 w-3.5 text-white/60" />
        <span className="text-[11px] font-medium text-white/60">Top Marcas</span>
      </div>
      {brands.map((b) => (
        <div key={b.name} className="flex items-center justify-between text-[11px]">
          <span className="text-white/70">
            {b.medal} {b.name}
          </span>
          <span className="text-white/40 font-medium">{b.val}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Ranking de Produtos ── */
function ProdutosCard() {
  const products = [
    { name: "Tênis Runner X", val: "R$ 12.400" },
    { name: "Jaqueta Sport", val: "R$ 9.850" },
    { name: "Mochila Urban", val: "R$ 7.200" },
  ];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 mb-1">
        <Trophy className="h-3.5 w-3.5 text-white/60" />
        <span className="text-[11px] font-medium text-white/60">Top Produtos</span>
      </div>
      {products.map((p, i) => (
        <div key={p.name} className="flex items-center justify-between text-[11px] gap-3">
          <span className="text-white/70 truncate">
            <span className="text-white/30 mr-1">#{i + 1}</span>
            {p.name}
          </span>
          <span className="text-white/40 font-medium whitespace-nowrap">{p.val}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Reputação ── */
function ReputacaoCard() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-12 w-12 shrink-0">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
          <motion.circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="#34d399"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="94.25"
            initial={{ strokeDashoffset: 94.25 }}
            animate={{ strokeDashoffset: 94.25 * 0.08 }}
            transition={{ duration: 1, delay: 2 }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-emerald-400">
          92%
        </span>
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-0.5">
          <Star className="h-3 w-3 text-white/60" />
          <span className="text-[11px] font-medium text-white/60">Reputação</span>
        </div>
        <p className="text-[10px] text-emerald-400/80">MercadoLíder</p>
      </div>
    </div>
  );
}

/* ── Metas ── */
function MetasCard() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Target className="h-3.5 w-3.5 text-white/60" />
        <span className="text-[11px] font-medium text-white/60">Meta Mensal</span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-white/50">R$ 89.200 / R$ 120.000</span>
          <span className="text-amber-400 font-medium">74%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-300"
            initial={{ width: 0 }}
            animate={{ width: "74%" }}
            transition={{ duration: 0.9, delay: 2.2 }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Container com posicionamento ── */
export default function FloatingFeatureCards() {
  const cards = [
    { id: 0, content: <ReputacaoCard />, className: "top-[18%] right-12 w-44", float: floatAnimation(4.5, 0) },
    { id: 1, content: <MetasCard />, className: "top-[6%] right-[30%] w-52", float: floatAnimation(5, 0.5) },
    { id: 2, content: <EstoqueCard />, className: "top-[48%] right-10 w-44", float: floatAnimation(4, 1) },
    { id: 3, content: <MarcasCard />, className: "bottom-[18%] right-8 w-44", float: floatAnimation(5.5, 1.5) },
    { id: 4, content: <ProdutosCard />, className: "bottom-[8%] left-[52%] w-52", float: floatAnimation(4.8, 0.8) },
  ];

  return (
    <>
      {cards.map((card) => (
        <motion.div
          key={card.id}
          className={`absolute z-[1] hidden xl:block ${cardBase} p-3 ${card.className}`}
          custom={card.id}
          variants={fadeScale}
          initial="hidden"
          animate="visible"
        >
          <motion.div animate={card.float}>{card.content}</motion.div>
        </motion.div>
      ))}
    </>
  );
}
