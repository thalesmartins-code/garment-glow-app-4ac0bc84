import type { LucideProps } from "lucide-react";
import { forwardRef } from "react";

/**
 * Custom sneaker/sport-shoe icon matching Lucide's style.
 * 24×24 viewBox, stroke-based, no fill.
 */
export const SportShoe = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = "currentColor", size = 24, strokeWidth = 2, className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Sole */}
      <path d="M2 17h20v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1Z" />
      {/* Shoe body */}
      <path d="M4 17v-3a3 3 0 0 1 3-3h1l2-3h2l1 2h4a4 4 0 0 1 4 4v3" />
      {/* Lace detail */}
      <path d="M10 11l1 2" />
      <path d="M8 12l1 2" />
    </svg>
  )
);

SportShoe.displayName = "SportShoe";
