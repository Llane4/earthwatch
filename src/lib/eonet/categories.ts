/**
 * Símbolos cartográficos. Mismas formas en el mapa (dibujadas en canvas)
 * y en la leyenda (SVG): ver src/lib/symbols.ts.
 */
export type SymbolKind =
  | "dot"
  | "cyclone"
  | "triangle"
  | "diamond"
  | "square"
  | "ring";

export type CategoryMeta = {
  id: string;
  label: string;
  /** Tinta de la categoría: legible sobre el papel y sobre el mapa. */
  color: string;
  symbol: SymbolKind;
};

/** Categorías de EONET v3 en el orden en que aparecen en la leyenda. */
export const CATEGORIES: CategoryMeta[] = [
  { id: "severeStorms", label: "Tormentas severas", color: "#2340a8", symbol: "cyclone" },
  { id: "wildfires", label: "Incendios", color: "#d4410b", symbol: "dot" },
  { id: "volcanoes", label: "Volcanes", color: "#8e1b3a", symbol: "triangle" },
  { id: "seaLakeIce", label: "Hielo marino y lacustre", color: "#1f8cb0", symbol: "diamond" },
  { id: "floods", label: "Inundaciones", color: "#0e7c7b", symbol: "square" },
  { id: "earthquakes", label: "Terremotos", color: "#6f3a96", symbol: "ring" },
  { id: "landslides", label: "Deslizamientos", color: "#86661c", symbol: "square" },
  { id: "drought", label: "Sequía", color: "#b07d00", symbol: "dot" },
  { id: "dustHaze", label: "Polvo y neblina", color: "#8a7a63", symbol: "dot" },
  { id: "snow", label: "Nieve", color: "#5d7787", symbol: "diamond" },
  { id: "tempExtremes", label: "Temperaturas extremas", color: "#c41d63", symbol: "ring" },
  { id: "waterColor", label: "Color del agua", color: "#15805a", symbol: "dot" },
  { id: "manmade", label: "Origen humano", color: "#4a4a4a", symbol: "square" },
];

export const FALLBACK_COLOR = "#4a5a66";

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string): CategoryMeta {
  return (
    byId.get(id) ?? { id, label: id, color: FALLBACK_COLOR, symbol: "dot" }
  );
}

/** Nombre de la imagen del símbolo de una categoría en el mapa. */
export function symbolImageId(categoryId: string): string {
  return `sym-${categoryId}`;
}
