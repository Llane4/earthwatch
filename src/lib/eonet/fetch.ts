import { normalizeEvent } from "./normalize";
import type {
  EonetEvent,
  EonetEventsResponse,
  EventStatus,
  NaturalEvent,
} from "./types";

const EONET_BASE = "https://eonet.gsfc.nasa.gov/api/v3";

/** Llamada directa a EONET, sin caché. Ordena por fecha más reciente. */
export async function fetchEonetEvents(
  status: EventStatus,
  days: number,
): Promise<NaturalEvent[]> {
  const url = new URL(`${EONET_BASE}/events`);
  url.searchParams.set("status", status);
  url.searchParams.set("days", String(days));

  const res = await fetch(url, { signal: AbortSignal.timeout(25_000) });
  if (!res.ok) {
    throw new Error(`EONET respondió ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as EonetEventsResponse;
  return data.events
    .map(normalizeEvent)
    .filter((e): e is NaturalEvent => e !== null)
    .sort((a, b) => Date.parse(b.latest.date) - Date.parse(a.latest.date));
}

/** Un evento concreto desde EONET; null si no existe. */
export async function fetchEonetEvent(id: string): Promise<NaturalEvent | null> {
  const res = await fetch(`${EONET_BASE}/events/${encodeURIComponent(id)}`, {
    signal: AbortSignal.timeout(25_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`EONET respondió ${res.status} ${res.statusText}`);
  }
  return normalizeEvent((await res.json()) as EonetEvent);
}
