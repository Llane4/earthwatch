"use client";

import { getCategory } from "@/lib/eonet/categories";
import type { NaturalEvent, TrackPoint } from "@/lib/eonet/types";
import {
  formatCoords,
  formatDate,
  formatDateTime,
  formatDayMonth,
  formatMagnitude,
  formatRelative,
} from "@/lib/format";
import { CategorySymbol } from "./CategorySymbol";
import { SatelliteCompare } from "./SatelliteCompare";

type Props = {
  event: NaturalEvent;
  overlayDay: string | null;
  onShowOnMap: (day: string | null) => void;
  onClose: () => void;
};

function peakOf(track: TrackPoint[]): TrackPoint | null {
  let peak: TrackPoint | null = null;
  for (const p of track) {
    if (p.magnitudeValue === null) continue;
    if (!peak || p.magnitudeValue > (peak.magnitudeValue ?? -Infinity)) peak = p;
  }
  return peak;
}

/** Resume el evento en una o dos frases, en vez de una rejilla de cifras. */
function summarize(event: NaturalEvent): string[] {
  const first = event.track[0];
  const lines: string[] = [];

  lines.push(
    event.closed
      ? `Seguido del ${formatDayMonth(first.date)} al ${formatDayMonth(event.closed)}; ya está cerrado.`
      : event.track.length > 1
        ? `Activo desde el ${formatDayMonth(first.date)}; última posición ${formatRelative(event.latest.date)}.`
        : `Activo; detectado ${formatRelative(event.latest.date)}.`,
  );

  const now = formatMagnitude(
    event.latest.magnitudeValue,
    event.latest.magnitudeUnit,
  );
  const peak = peakOf(event.track);
  if (now && peak && peak !== event.latest && event.track.length > 1) {
    lines.push(
      `Ahora ${now}; alcanzó ${formatMagnitude(peak.magnitudeValue, peak.magnitudeUnit)} el ${formatDayMonth(peak.date)}.`,
    );
  } else if (now) {
    lines.push(`Magnitud registrada: ${now}.`);
  }
  return lines;
}

export function EventDetail({
  event,
  overlayDay,
  onShowOnMap,
  onClose,
}: Props) {
  const cat = getCategory(event.category.id);

  return (
    <article className="space-y-6 px-5 py-5">
      <BackButton onClick={onClose} />

      <header className="space-y-2">
        <p className="flex items-center gap-2 text-sm" style={{ color: cat.color }}>
          <CategorySymbol kind={cat.symbol} color={cat.color} />
          {cat.label}
        </p>
        <h2 className="text-2xl leading-tight font-bold font-stretch-semi-expanded text-ink">
          {event.title}
        </h2>
        {summarize(event).map((line) => (
          <p key={line} className="text-[15px] leading-relaxed text-ink">
            {line}
          </p>
        ))}
        {event.description && (
          <p className="text-sm leading-relaxed text-ink-soft">
            {event.description}
          </p>
        )}
      </header>

      <dl className="divide-y divide-rule border-y border-rule text-sm">
        <Row term="Última posición" value={formatCoords(event.latest.coordinates)} />
        <Row term="Actualizado" value={formatDateTime(event.latest.date)} />
        {event.track.length > 1 && (
          <Row
            term="Registros"
            value={`${event.track.length} posiciones desde el ${formatDate(event.track[0].date)}`}
          />
        )}
      </dl>

      <SatelliteCompare
        key={event.id}
        event={event}
        overlayDay={overlayDay}
        onShowOnMap={onShowOnMap}
      />

      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold font-stretch-semi-expanded">
          Fuentes
        </h3>
        <ul className="space-y-1 text-sm">
          {event.sources.map((s) => (
            <li key={s.id + s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink underline decoration-ink-faint underline-offset-2 hover:decoration-ink"
              >
                {s.id}
              </a>
            </li>
          ))}
          <li>
            <a
              href={event.eonetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink underline decoration-ink-faint underline-offset-2 hover:decoration-ink"
            >
              Registro en NASA EONET
            </a>
          </li>
        </ul>
      </section>
    </article>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 py-2">
      <dt className="text-ink-soft">{term}</dt>
      <dd className="text-ink tabular-nums">{value}</dd>
    </div>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
        <path
          d="M10 3L5 8l5 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
      Volver a la lista
    </button>
  );
}
