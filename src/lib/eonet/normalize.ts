import type {
  EonetEvent,
  EonetGeometry,
  EventSummary,
  LngLat,
  NaturalEvent,
  TrackPoint,
} from "./types";

function isLngLat(value: unknown): value is LngLat {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

/** Centroide simple (promedio de vértices) del anillo exterior de un polígono. */
export function polygonCentroid(rings: number[][][]): LngLat | null {
  const ring = rings[0];
  if (!ring || ring.length === 0) return null;
  // En GeoJSON el último vértice repite el primero: se excluye del promedio.
  const first = ring[0];
  const last = ring[ring.length - 1];
  const isClosed =
    ring.length > 1 && first[0] === last[0] && first[1] === last[1];
  const vertices = isClosed ? ring.slice(0, -1) : ring;

  let lng = 0;
  let lat = 0;
  for (const [x, y] of vertices) {
    lng += x;
    lat += y;
  }
  const centroid = [lng / vertices.length, lat / vertices.length];
  return isLngLat(centroid) ? centroid : null;
}

export function toTrackPoint(geometry: EonetGeometry): TrackPoint | null {
  let coordinates: LngLat | null = null;
  if (geometry.type === "Point") {
    const c = geometry.coordinates;
    coordinates = isLngLat(c) ? [c[0], c[1]] : null;
  } else if (geometry.type === "Polygon") {
    coordinates = polygonCentroid(geometry.coordinates as number[][][]);
  }

  if (!coordinates) return null;
  return {
    date: geometry.date,
    coordinates,
    magnitudeValue: geometry.magnitudeValue ?? null,
    magnitudeUnit: geometry.magnitudeUnit ?? null,
  };
}

/** Redondea a 3 decimales (~100 m), suficiente para dibujar en el mapa. */
export function roundCoord(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function toSummary(e: NaturalEvent): EventSummary {
  const [lng, lat] = e.latest.coordinates;
  return {
    id: e.id,
    title: e.title,
    categoryId: e.category.id,
    open: e.closed === null,
    date: e.latest.date,
    lng: roundCoord(lng),
    lat: roundCoord(lat),
    points: e.track.length,
    ...(e.track.length > 1 && {
      path: e.track.map(
        (p) => [roundCoord(p.coordinates[0]), roundCoord(p.coordinates[1])] as LngLat,
      ),
    }),
  };
}

export function normalizeEvent(event: EonetEvent): NaturalEvent | null {
  const track = (event.geometry ?? [])
    .map(toTrackPoint)
    .filter((p): p is TrackPoint => p !== null)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

  const latest = track.at(-1);
  const category = event.categories?.[0];
  if (!latest || !category) return null;

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    eonetUrl: event.link,
    closed: event.closed,
    category: { id: category.id, title: category.title },
    sources: event.sources ?? [],
    track,
    latest,
  };
}
