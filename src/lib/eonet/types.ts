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

export type EventsPayload = {
  events: NaturalEvent[];
  /** Momento en que se generó la respuesta (o de la última sincronización). */
  fetchedAt: string;
  /** De dónde salieron los datos: nuestra base o EONET en vivo. */
  source: "database" | "eonet";
  lastSyncAt?: string | null;
};
