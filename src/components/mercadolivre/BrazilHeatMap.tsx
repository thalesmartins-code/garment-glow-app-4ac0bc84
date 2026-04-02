import { useState, useMemo } from "react";

interface StateData {
  uf: string;
  name: string;
  orders: number;
  revenue: number;
  avgTicket: number;
  pct: number;
}

interface BrazilHeatMapProps {
  data: StateData[];
}

// Simplified SVG paths for Brazilian states (viewBox 0 0 800 750)
const STATE_PATHS: Record<string, string> = {
  AC: "M48,340 L48,370 L80,370 L80,390 L48,390 L48,410 L100,410 L100,340 Z",
  AM: "M80,180 L80,340 L200,340 L200,280 L280,280 L280,220 L240,220 L240,180 L200,160 L140,160 Z",
  RR: "M180,60 L180,160 L240,160 L240,120 L260,80 L240,60 Z",
  AP: "M320,60 L300,100 L300,160 L340,160 L360,120 L360,60 Z",
  PA: "M200,140 L200,280 L280,280 L340,280 L400,280 L400,200 L360,160 L340,160 L300,160 L300,140 Z",
  MA: "M400,200 L400,280 L480,280 L480,240 L500,220 L480,200 Z",
  PI: "M480,240 L480,330 L520,330 L530,280 L520,240 Z",
  CE: "M530,220 L520,240 L530,280 L560,280 L580,250 L570,220 Z",
  RN: "M580,240 L570,260 L590,280 L610,260 Z",
  PB: "M560,280 L560,300 L610,300 L610,270 L590,280 Z",
  PE: "M520,300 L520,330 L600,330 L610,300 L560,300 Z",
  AL: "M600,330 L600,350 L620,340 L620,320 Z",
  SE: "M590,350 L590,370 L610,360 L610,340 Z",
  BA: "M430,320 L430,440 L500,500 L560,500 L580,440 L600,400 L600,350 L590,370 L560,370 L520,330 L480,330 Z",
  TO: "M380,280 L380,400 L430,400 L430,320 L400,280 Z",
  GO: "M360,400 L360,500 L440,520 L470,480 L470,440 L430,440 L430,400 Z",
  DF: "M420,440 L420,460 L440,460 L440,440 Z",
  MT: "M200,340 L200,440 L280,480 L360,480 L360,400 L380,400 L380,280 L340,280 L280,280 Z",
  MS: "M240,480 L240,560 L320,580 L360,540 L360,480 L280,480 Z",
  MG: "M440,440 L440,520 L460,560 L520,580 L560,560 L580,500 L560,500 L500,500 L470,480 L470,440 Z",
  ES: "M560,500 L560,540 L590,520 L590,490 Z",
  RJ: "M500,560 L500,580 L540,590 L560,570 L560,540 L520,560 Z",
  SP: "M360,520 L360,580 L440,600 L500,580 L500,560 L460,560 L440,520 Z",
  PR: "M320,580 L320,620 L420,630 L440,600 L360,580 Z",
  SC: "M340,630 L340,660 L420,660 L420,630 Z",
  RS: "M300,660 L300,720 L380,720 L400,690 L420,660 L340,660 Z",
  RO: "M100,340 L100,410 L160,430 L200,440 L200,340 Z",
};

// State label positions (approximate center of each state)
const STATE_LABELS: Record<string, [number, number]> = {
  AC: [74, 375], AM: [180, 250], RR: [215, 110], AP: [330, 110],
  PA: [300, 210], MA: [450, 240], PI: [505, 285], CE: [555, 250],
  RN: [590, 255], PB: [580, 290], PE: [560, 315], AL: [610, 340],
  SE: [600, 360], BA: [520, 410], TO: [405, 340], GO: [410, 460],
  DF: [430, 450], MT: [290, 380], MS: [300, 530], MG: [510, 510],
  ES: [575, 515], RJ: [530, 572], SP: [420, 565], PR: [375, 605],
  SC: [380, 645], RS: [355, 690], RO: [150, 385],
};

function getHeatColor(intensity: number): string {
  // 0 = light (low), 1 = dark saturated (high)
  // Using a green-yellow-orange-red gradient
  const clamped = Math.max(0, Math.min(1, intensity));
  if (clamped < 0.25) {
    // light green
    const t = clamped / 0.25;
    const h = 120 - t * 30;
    return `hsl(${h}, ${50 + t * 20}%, ${85 - t * 15}%)`;
  } else if (clamped < 0.5) {
    const t = (clamped - 0.25) / 0.25;
    const h = 90 - t * 40;
    return `hsl(${h}, ${70 + t * 10}%, ${70 - t * 10}%)`;
  } else if (clamped < 0.75) {
    const t = (clamped - 0.5) / 0.25;
    const h = 50 - t * 30;
    return `hsl(${h}, ${80 + t * 10}%, ${60 - t * 10}%)`;
  } else {
    const t = (clamped - 0.75) / 0.25;
    const h = 20 - t * 20;
    return `hsl(${h}, ${90 + t * 10}%, ${50 - t * 15}%)`;
  }
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtNum = (v: number) => v.toLocaleString("pt-BR");

export function BrazilHeatMap({ data }: BrazilHeatMapProps) {
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const dataMap = useMemo(() => {
    const map = new Map<string, StateData>();
    data.forEach((d) => map.set(d.uf, d));
    return map;
  }, [data]);

  const maxOrders = useMemo(() => Math.max(...data.map((d) => d.orders), 1), [data]);

  const hoveredData = hoveredState ? dataMap.get(hoveredState) : null;

  return (
    <div className="relative">
      <svg
        viewBox="30 40 620 700"
        className="w-full max-w-[600px] mx-auto h-auto"
        onMouseLeave={() => setHoveredState(null)}
      >
        {Object.entries(STATE_PATHS).map(([uf, path]) => {
          const stateData = dataMap.get(uf);
          const intensity = stateData ? stateData.orders / maxOrders : 0;
          const isHovered = hoveredState === uf;

          return (
            <g key={uf}>
              <path
                d={path}
                fill={getHeatColor(intensity)}
                stroke="hsl(var(--background))"
                strokeWidth={isHovered ? 2.5 : 1.2}
                className="transition-all duration-150 cursor-pointer"
                opacity={hoveredState && !isHovered ? 0.6 : 1}
                onMouseEnter={(e) => {
                  setHoveredState(uf);
                  const svg = e.currentTarget.ownerSVGElement;
                  if (svg) {
                    const rect = svg.getBoundingClientRect();
                    setTooltipPos({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                  }
                }}
                onMouseMove={(e) => {
                  const svg = e.currentTarget.ownerSVGElement;
                  if (svg) {
                    const rect = svg.getBoundingClientRect();
                    setTooltipPos({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                  }
                }}
              />
              {STATE_LABELS[uf] && (
                <text
                  x={STATE_LABELS[uf][0]}
                  y={STATE_LABELS[uf][1]}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="pointer-events-none select-none"
                  fill={intensity > 0.5 ? "white" : "hsl(var(--foreground))"}
                  fontSize={intensity > 0.3 ? 13 : 11}
                  fontWeight={isHovered ? 700 : intensity > 0.5 ? 600 : 400}
                  opacity={isHovered ? 1 : 0.85}
                >
                  {uf}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredData && (
        <div
          className="absolute pointer-events-none z-10 rounded-lg border border-border/50 bg-background px-3 py-2 shadow-xl text-xs"
          style={{
            left: tooltipPos.x + 12,
            top: tooltipPos.y - 60,
            minWidth: 180,
          }}
        >
          <div className="font-semibold text-sm mb-1">{hoveredData.name} ({hoveredData.uf})</div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Pedidos:</span>
            <span className="font-medium">{fmtNum(hoveredData.orders)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Receita:</span>
            <span className="font-medium">{fmt(hoveredData.revenue)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Ticket Médio:</span>
            <span className="font-medium">{fmt(hoveredData.avgTicket)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">% Total:</span>
            <span className="font-medium">{hoveredData.pct.toFixed(1)}%</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
        <span>Menos pedidos</span>
        <div className="flex h-3 rounded overflow-hidden">
          {[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1].map((v) => (
            <div key={v} className="w-6 h-3" style={{ backgroundColor: getHeatColor(v) }} />
          ))}
        </div>
        <span>Mais pedidos</span>
      </div>
    </div>
  );
}
