/**
 * Utilidades para NASA GIBS (Global Imagery Browse Services).
 * https://nasa-gibs.github.io/gibs-api-docs/
 */
import type { NaturalEvent } from "./eonet/types";

const GIBS = "https://gibs.earthdata.nasa.gov";

export const TRUE_COLOR = "VIIRS_NOAA20_CorrectedReflectance_TrueColor";
export const FIRE_HOTSPOTS = "VIIRS_NOAA20_Thermal_Anomalies_375m_All";

const DAY_MS = 86_400_000;

/** "YYYY-MM-DD" en UTC. */
export function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function shiftDay(day: string, delta: number): string {
  return toDay(new Date(Date.parse(`${day}T00:00:00Z`) + delta * DAY_MS));
}

/**
 * Último día con imagen completa. La pasada del día en curso suele estar
 * incompleta, así que usamos ayer como máximo.
 */
export function latestAvailableDay(now = new Date()): string {
  return toDay(new Date(now.getTime() - DAY_MS));
}

export function clampDay(day: string, now = new Date()): string {
  const max = latestAvailableDay(now);
  return day > max ? max : day;
}

/** Fechas por defecto para comparar: una semana antes del inicio vs. último registro. */
export function defaultCompareDays(event: NaturalEvent, now = new Date()) {
  const after = clampDay(event.latest.date.slice(0, 10), now);
  const before = shiftDay(clampDay(event.track[0].date.slice(0, 10), now), -7);
  return { before, after };
}

/** Los incendios añaden los focos de calor detectados por VIIRS. */
export function layersFor(categoryId: string): string[] {
  return categoryId === "wildfires" ? [TRUE_COLOR, FIRE_HOTSPOTS] : [TRUE_COLOR];
}

/** Lado mínimo (en grados de latitud) de la vista según el tipo de evento. */
function minSpanFor(categoryId: string): number {
  switch (categoryId) {
    case "wildfires":
    case "volcanoes":
    case "landslides":
      return 1;
    case "severeStorms":
      return 8;
    default:
      return 3;
  }
}

export type BBox = [west: number, south: number, east: number, north: number];

/**
 * Caja cuadrada (visualmente) alrededor del evento. La longitud se
 * ensancha con 1/cos(lat) para compensar la proyección EPSG:4326.
 */
export function snapshotBBox(event: NaturalEvent): BBox {
  const lngs = event.track.map((p) => p.coordinates[0]);
  const lats = event.track.map((p) => p.coordinates[1]);
  const west = Math.min(...lngs);
  const east = Math.max(...lngs);
  const south = Math.min(...lats);
  const north = Math.max(...lats);

  const centerLng = (west + east) / 2;
  const centerLat = (south + north) / 2;
  const cosLat = Math.max(Math.cos((centerLat * Math.PI) / 180), 0.2);

  const latSpan = Math.max(
    minSpanFor(event.category.id),
    (north - south) * 1.3,
    (east - west) * cosLat * 1.3,
  );
  const lngSpan = latSpan / cosLat;

  return [
    Math.max(centerLng - lngSpan / 2, -180),
    Math.max(centerLat - latSpan / 2, -90),
    Math.min(centerLng + lngSpan / 2, 180),
    Math.min(centerLat + latSpan / 2, 90),
  ];
}

/** Imagen única vía WMS (EPSG:4326, en 1.3.0 el orden del BBOX es lat,lon). */
export function snapshotUrl(opts: {
  layers: string[];
  day: string;
  bbox: BBox;
  size?: number;
}): string {
  const [west, south, east, north] = opts.bbox;
  const size = opts.size ?? 640;
  const params = new URLSearchParams({
    SERVICE: "WMS",
    REQUEST: "GetMap",
    VERSION: "1.3.0",
    LAYERS: opts.layers.join(","),
    STYLES: "",
    FORMAT: "image/jpeg",
    CRS: "EPSG:4326",
    BBOX: [south, west, north, east].map((n) => n.toFixed(4)).join(","),
    WIDTH: String(size),
    HEIGHT: String(size),
    TIME: opts.day,
  });
  return `${GIBS}/wms/epsg4326/best/wms.cgi?${params}`;
}

/** Plantilla de mosaicos WMTS (Web Mercator) de color real para MapLibre. */
export function trueColorTiles(day: string): string {
  return `${GIBS}/wmts/epsg3857/best/${TRUE_COLOR}/default/${day}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
}

/** Plantilla WMS transparente (focos de calor) para MapLibre. */
export function fireHotspotTiles(day: string): string {
  return (
    `${GIBS}/wms/epsg3857/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0` +
    `&LAYERS=${FIRE_HOTSPOTS}&STYLES=&FORMAT=image/png&TRANSPARENT=true` +
    `&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&TIME=${day}`
  );
}
