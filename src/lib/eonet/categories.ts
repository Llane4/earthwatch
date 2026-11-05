export type CategoryMeta = {
  id: string;
  label: string;
  color: string;
};

/** Categorías de EONET v3 con etiqueta en español y color para el mapa. */
export const CATEGORIES: CategoryMeta[] = [
  { id: "wildfires", label: "Incendios", color: "#f97316" },
  { id: "severeStorms", label: "Tormentas severas", color: "#38bdf8" },
  { id: "volcanoes", label: "Volcanes", color: "#ef4444" },
  { id: "seaLakeIce", label: "Hielo marino y lacustre", color: "#a5f3fc" },
  { id: "floods", label: "Inundaciones", color: "#6366f1" },
  { id: "earthquakes", label: "Terremotos", color: "#e879f9" },
  { id: "landslides", label: "Deslizamientos", color: "#a3e635" },
  { id: "drought", label: "Sequía", color: "#facc15" },
  { id: "dustHaze", label: "Polvo y neblina", color: "#d6d3d1" },
  { id: "snow", label: "Nieve", color: "#f8fafc" },
  { id: "tempExtremes", label: "Temperaturas extremas", color: "#fb7185" },
  { id: "waterColor", label: "Color del agua", color: "#2dd4bf" },
  { id: "manmade", label: "Origen humano", color: "#94a3b8" },
];

export const FALLBACK_COLOR = "#94a3b8";

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string): CategoryMeta {
  return byId.get(id) ?? { id, label: id, color: FALLBACK_COLOR };
}
