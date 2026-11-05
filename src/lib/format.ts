const dateTime = new Intl.DateTimeFormat("es", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const dateOnly = new Intl.DateTimeFormat("es", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export function formatDateTime(iso: string): string {
  return `${dateTime.format(new Date(iso))} UTC`;
}

export function formatDate(iso: string): string {
  return dateOnly.format(new Date(iso));
}

export function formatCoords([lng, lat]: [number, number]): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "O";
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${Math.abs(lng).toFixed(2)}° ${ew}`;
}

/** Unidades que envía EONET, en su forma española. */
const UNITS: Record<string, string> = {
  hectare: "ha",
  hectares: "ha",
  acres: "acres",
  kts: "kts",
  "NM^2": "mn²",
};

const number = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });

/** "5341 ha", "130 kts", "1056 mn²" (millas náuticas cuadradas). */
export function formatMagnitude(
  value: number | null,
  unit: string | null,
): string | null {
  if (value === null) return null;
  const n = number.format(value);
  if (!unit) return n;
  return `${n} ${UNITS[unit] ?? unit}`;
}

const dayMonth = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "5 nov" — para columnas y etiquetas de carta. */
export function formatDayMonth(iso: string): string {
  return dayMonth.format(new Date(iso));
}

const relative = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

/** "hace 12 minutos", "hace 3 horas", "ayer"… */
export function formatRelative(iso: string, now = Date.now()): string {
  const seconds = Math.round((Date.parse(iso) - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return relative.format(seconds, "second");
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return relative.format(Math.round(seconds / 3600), "hour");
  return relative.format(Math.round(seconds / 86_400), "day");
}

/** Plural sencillo: plural(3, "evento") → "3 eventos". */
export function plural(n: number, singular: string, pluralForm?: string): string {
  return `${n.toLocaleString("es")} ${n === 1 ? singular : (pluralForm ?? `${singular}s`)}`;
}
