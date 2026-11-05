import type { FeatureCollection, LineString, Point } from "geojson";
import type { EventSummary, LngLat } from "./types";

/**
 * Evita que una trayectoria que cruza el antimeridiano (179° → -179°) se
 * dibuje dando la vuelta al mundo: cada punto se desplaza ±360° para que
 * quede a menos de 180° del anterior. MapLibre admite longitudes > 180.
 */
export function unwrapPath(path: LngLat[]): LngLat[] {
  const out: LngLat[] = [];
  let offset = 0;
  for (let i = 0; i < path.length; i++) {
    const [lng, lat] = path[i];
    if (i > 0) {
      const prev = path[i - 1][0];
      if (lng - prev > 180) offset -= 360;
      else if (prev - lng > 180) offset += 360;
    }
    out.push([lng + offset, lat]);
  }
  return out;
}

export type EventFeatureProps = { id: string; categoryId: string };

/** Un punto por evento, en su posición más reciente. */
export function toPointCollection(
  events: EventSummary[],
): FeatureCollection<Point, EventFeatureProps> {
  return {
    type: "FeatureCollection",
    features: events.map((e) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [e.lng, e.lat] },
      properties: { id: e.id, categoryId: e.categoryId },
    })),
  };
}

/** Trayectorias: solo eventos con más de una posición (p. ej. ciclones). */
export function toTrackCollection(
  events: EventSummary[],
): FeatureCollection<LineString, EventFeatureProps> {
  const features: FeatureCollection<LineString, EventFeatureProps>["features"] =
    [];
  for (const e of events) {
    if (!e.path) continue;
    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: unwrapPath(e.path) },
      properties: { id: e.id, categoryId: e.categoryId },
    });
  }
  return { type: "FeatureCollection", features };
}
