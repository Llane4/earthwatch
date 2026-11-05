/** Respuesta cruda de EONET v3 (https://eonet.gsfc.nasa.gov/docs/v3). */
export type EonetGeometry = {
  magnitudeValue: number | null;
  magnitudeUnit: string | null;
  date: string;
  type: "Point" | "Polygon";
  coordinates: number[] | number[][][];
};

export type EonetEvent = {
  id: string;
  title: string;
  description: string | null;
  link: string;
  closed: string | null;
  categories: { id: string; title: string }[];
  sources: { id: string; url: string }[];
  geometry: EonetGeometry[];
};

export type EonetEventsResponse = {
  events: EonetEvent[];
};

/** Modelo normalizado que usa la app. */
export type EventStatus = "open" | "closed" | "all";

export type LngLat = [lng: number, lat: number];

export type TrackPoint = {
  date: string;
  coordinates: LngLat;
  magnitudeValue: number | null;
  magnitudeUnit: string | null;
};

export type NaturalEvent = {
  id: string;
  title: string;
  description: string | null;
  eonetUrl: string;
  closed: string | null;
  category: { id: string; title: string };
  sources: { id: string; url: string }[];
  /** Posiciones ordenadas por fecha (ascendente). */
  track: TrackPoint[];
  latest: TrackPoint;
};

/**
 * Versión ligera de un evento: solo lo que necesitan el mapa y la lista.
 * El detalle completo (fuentes, magnitudes, fechas de cada posición) se
 * pide aparte a /api/events/[id] al abrir el evento.
 */
export type EventSummary = {
  id: string;
  title: string;
  categoryId: string;
  /** true si el evento sigue activo (EONET aún no lo cerró). */
  open: boolean;
  /** Fecha de la última posición (ISO). */
  date: string;
  /** Última posición, redondeada a 3 decimales (~100 m). */
  lng: number;
  lat: number;
  /** Número de posiciones registradas. */
  points: number;
  /** Recorrido completo; solo si hay más de una posición. */
  path?: LngLat[];
};

export type EventsPayload = {
  events: EventSummary[];
  /** Momento en que se generó la respuesta. */
  fetchedAt: string;
  /** De dónde salieron los datos: nuestra base o EONET en vivo. */
  source: "database" | "eonet";
  lastSyncAt?: string | null;
};
