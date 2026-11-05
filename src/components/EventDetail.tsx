"use client";

import { getCategory } from "@/lib/eonet/categories";
import type { NaturalEvent } from "@/lib/eonet/types";
import {
  formatCoords,
  formatDate,
  formatDateTime,
  formatMagnitude,
} from "@/lib/format";
import { SatelliteCompare } from "./SatelliteCompare";

type Props = {
  event: NaturalEvent;
  overlayDay: string | null;
  onShowOnMap: (day: string | null) => void;
  onClose: () => void;
};

export function EventDetail({
  event,
  overlayDay,
  onShowOnMap,
  onClose,
}: Props) {
  const cat = getCategory(event.category.id);
  const first = event.track[0];
  const magnitude = formatMagnitude(
    event.latest.magnitudeValue,
    event.latest.magnitudeUnit,
  );
  const peak = event.track.reduce<number | null>(
    (max, p) =>
      p.magnitudeValue !== null && (max === null || p.magnitudeValue > max)
        ? p.magnitudeValue
        : max,
    null,
  );

  return (
    <div className="space-y-5 px-4 py-4">
      <button
        onClick={onClose}
        className="text-xs text-slate-400 transition hover:text-white"
      >
        ← Volver a la lista
      </button>

      <div className="space-y-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-slate-950"
          style={{ backgroundColor: cat.color }}
        >
          {cat.label}
        </span>
        <h2 className="text-lg font-semibold leading-snug text-white">
          {event.title}
        </h2>
        <p className="text-xs text-slate-400">
          {event.closed ? (
            <>Cerrado el {formatDate(event.closed)}</>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
              Activo
            </span>
          )}
        </p>
        {event.description && (
          <p className="text-sm text-slate-300">{event.description}</p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Stat label="Última actualización" value={formatDateTime(event.latest.date)} wide />
        <Stat label="Posición" value={formatCoords(event.latest.coordinates)} wide />
        {magnitude && <Stat label="Magnitud actual" value={magnitude} />}
        {peak !== null && event.track.length > 1 && (
          <Stat
            label="Magnitud máxima"
            value={formatMagnitude(peak, event.latest.magnitudeUnit) ?? ""}
          />
        )}
        {event.track.length > 1 && (
          <>
            <Stat label="Primer registro" value={formatDate(first.date)} />
            <Stat label="Posiciones" value={String(event.track.length)} />
          </>
        )}
      </dl>

      <SatelliteCompare
        key={event.id}
        event={event}
        overlayDay={overlayDay}
        onShowOnMap={onShowOnMap}
      />

      <div>
        <h3 className="mb-2 text-xs text-slate-400">Fuentes</h3>
        <ul className="flex flex-wrap gap-1.5">
          {event.sources.map((s) => (
            <li key={s.id + s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-md bg-white/5 px-2 py-1 text-xs text-sky-300 transition hover:bg-white/10"
              >
                {s.id} ↗
              </a>
            </li>
          ))}
          <li>
            <a
              href={event.eonetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-md bg-white/5 px-2 py-1 text-xs text-sky-300 transition hover:bg-white/10"
            >
              EONET ↗
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={`rounded-lg bg-white/5 p-3 ${wide ? "col-span-2" : ""}`}>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-0.5 tabular-nums text-slate-100">{value}</dd>
    </div>
  );
}
