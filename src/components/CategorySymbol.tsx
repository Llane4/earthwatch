import type { SymbolKind } from "@/lib/eonet/categories";
import { SYMBOL_PATHS } from "@/lib/symbols";

type Props = {
  kind: SymbolKind;
  color: string;
  size?: number;
  muted?: boolean;
  className?: string;
};

/** El mismo símbolo que se dibuja en el mapa, para la leyenda y la lista. */
export function CategorySymbol({
  kind,
  color,
  size = 18,
  muted = false,
  className,
}: Props) {
  const { d, evenOdd } = SYMBOL_PATHS[kind];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
    >
      <path
        d={d}
        fill={muted ? "none" : color}
        fillRule={evenOdd ? "evenodd" : "nonzero"}
        stroke={muted ? color : "none"}
        strokeWidth={muted ? 1.4 : 0}
        strokeLinejoin="round"
      />
    </svg>
  );
}
