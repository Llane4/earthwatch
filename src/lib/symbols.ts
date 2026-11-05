import type { SymbolKind } from "./eonet/categories";

/**
 * Trazados SVG (caja 24×24) de cada símbolo. La misma fuente sirve para
 * la leyenda (SVG) y para el mapa (Path2D en canvas).
 */
export const SYMBOL_PATHS: Record<SymbolKind, { d: string; evenOdd?: boolean }> = {
  dot: { d: "M12 6.5a5.5 5.5 0 1 0 0 11a5.5 5.5 0 1 0 0-11Z" },
  // Símbolo meteorológico de ciclón tropical: núcleo y dos brazos.
  cyclone: {
    d:
      "M12 7.6a4.4 4.4 0 1 0 0 8.8a4.4 4.4 0 1 0 0-8.8Z" +
      "M16 11C16.6 6.4 12.8 2.6 6.6 2.8C11.2 4.4 13.2 6.6 12.8 8.9Z" +
      "M8 13C7.4 17.6 11.2 21.4 17.4 21.2C12.8 19.6 10.8 17.4 11.2 15.1Z",
  },
  triangle: { d: "M12 4.6L19.4 18.2H4.6Z" },
  diamond: { d: "M12 4.2L19.8 12L12 19.8L4.2 12Z" },
  square: { d: "M6.4 6.4H17.6V17.6H6.4Z" },
  ring: {
    d: "M12 4.8a7.2 7.2 0 1 0 0 14.4a7.2 7.2 0 1 0 0-14.4Zm0 3.7a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0-7Z",
    evenOdd: true,
  },
};

const PAPER = "#eef2f3";

/** Dibuja un símbolo con halo de papel; devuelve píxeles para map.addImage. */
export function rasterizeSymbol(
  kind: SymbolKind,
  color: string,
  pixelRatio = 2,
): { width: number; height: number; data: Uint8ClampedArray } {
  const size = 24 * pixelRatio;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");

  const { d, evenOdd } = SYMBOL_PATHS[kind];
  const path = new Path2D(d);
  ctx.scale(pixelRatio, pixelRatio);
  ctx.lineJoin = "round";
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 3;
  ctx.stroke(path);
  ctx.fillStyle = color;
  ctx.fill(path, evenOdd ? "evenodd" : "nonzero");

  const { data } = ctx.getImageData(0, 0, size, size);
  return { width: size, height: size, data };
}
