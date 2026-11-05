import type { FeatureCollection, LineString, Point } from "geojson";
import type { EventSummary } from "./types";

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
      geometry: { type: "LineString", coordinates: e.path },
      properties: { id: e.id, categoryId: e.categoryId },
    });
  }
  return { type: "FeatureCollection", features };
}

/** Posiciones individuales de un evento, para resaltar su recorrido. */
export function toTrackPoints(
  event: EventSummary | undefined,
): FeatureCollection<Point, { index: number }> {
  return {
    type: "FeatureCollection",
    features: (event?.path ?? []).map((coordinates, index) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates },
      properties: { index },
    })),
  };
}
