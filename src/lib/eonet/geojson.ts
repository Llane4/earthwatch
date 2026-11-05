import type { FeatureCollection, LineString, Point } from "geojson";
import type { NaturalEvent } from "./types";

export type EventFeatureProps = { id: string; categoryId: string };

/** Un punto por evento, en su posición más reciente. */
export function toPointCollection(
  events: NaturalEvent[],
): FeatureCollection<Point, EventFeatureProps> {
  return {
    type: "FeatureCollection",
    features: events.map((e) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: e.latest.coordinates },
      properties: { id: e.id, categoryId: e.category.id },
    })),
  };
}

/** Trayectorias: solo eventos con más de una posición (p. ej. ciclones). */
export function toTrackCollection(
  events: NaturalEvent[],
): FeatureCollection<LineString, EventFeatureProps> {
  return {
    type: "FeatureCollection",
    features: events
      .filter((e) => e.track.length > 1)
      .map((e) => ({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: e.track.map((p) => p.coordinates),
        },
        properties: { id: e.id, categoryId: e.category.id },
      })),
  };
}

/** Posiciones individuales de un evento, para resaltar su recorrido. */
export function toTrackPoints(
  event: NaturalEvent | undefined,
): FeatureCollection<Point, { index: number }> {
  return {
    type: "FeatureCollection",
    features: (event?.track ?? []).map((p, index) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: p.coordinates },
      properties: { index },
    })),
  };
}
