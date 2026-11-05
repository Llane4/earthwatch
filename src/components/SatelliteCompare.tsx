"use client";

import { useState } from "react";
import type { NaturalEvent } from "@/lib/eonet/types";
import { formatDate, formatDayMonth } from "@/lib/format";
import {
  defaultCompareDays,
  latestAvailableDay,
  layersFor,
  shiftDay,
  snapshotBBox,
  snapshotUrl,
} from "@/lib/gibs";

type Props = {
  event: NaturalEvent;
  overlayDay: string | null;
  onShowOnMap: (day: string | null) => void;
};

/**
 * Comparador antes/después con imágenes de NASA GIBS.
 * El padre debe montarlo con `key={event.id}` para reiniciar las fechas.
 */
export function SatelliteCompare({ event, overlayDay, onShowOnMap }: Props) {
  const [days, setDays] = useState(() => defaultCompareDays(event));
  const [position, setPosition] = useState(50);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});

  const maxDay = latestAvailableDay();
  const bbox = snapshotBBox(event);
  const layers = layersFor(event.category.id);
  const beforeUrl = snapshotUrl({ layers, day: days.before, bbox });
  const afterUrl = snapshotUrl({ layers, day: days.after, bbox });
  const loading = !loaded[beforeUrl] || !loaded[afterUrl];
  const markLoaded = (url: string) =>
    setLoaded((prev) => ({ ...prev, [url]: true }));

  const isFire = event.category.id === "wildfires";
  const overlayActive = overlayDay === days.after;

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold font-stretch-semi-expanded">
        Desde el satélite
      </h3>

      <figure className="space-y-2">
        <div className="relative aspect-square overflow-hidden rounded-[2px] bg-paper-deep ring-1 ring-ink select-none">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen externa dinámica de GIBS */}
          <img
            src={afterUrl}
            alt={`Imagen satelital de ${event.title} el ${formatDate(days.after)}`}
            onLoad={() => markLoaded(afterUrl)}
            onError={() => markLoaded(afterUrl)}
            className="absolute inset-0 size-full object-cover"
            draggable={false}
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen externa dinámica de GIBS */}
          <img
            src={beforeUrl}
            alt={`La misma zona el ${formatDate(days.before)}`}
            onLoad={() => markLoaded(beforeUrl)}
            onError={() => markLoaded(beforeUrl)}
            className="absolute inset-0 size-full object-cover"
            style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
            draggable={false}
          />

          <div
            className="pointer-events-none absolute inset-y-0 w-px bg-paper"
            style={{ left: `${position}%` }}
          >
            <span className="absolute top-1/2 left-1/2 flex h-8 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2px] bg-paper ring-1 ring-ink">
              <svg width="8" height="12" viewBox="0 0 8 12" aria-hidden>
                <path d="M2 1v10M6 1v10" stroke="#14212b" strokeWidth="1.2" />
              </svg>
            </span>
          </div>

          <span className="pointer-events-none absolute top-2 left-2 bg-paper px-1.5 text-xs text-ink tabular-nums">
            {formatDayMonth(days.before)}
          </span>
          <span className="pointer-events-none absolute top-2 right-2 bg-paper px-1.5 text-xs text-ink tabular-nums">
            {formatDayMonth(days.after)}
          </span>

          {loading && (
            <div className="pointer-events-none absolute inset-0 flex items-end bg-paper/30 p-2">
              <span className="bg-paper px-1.5 text-xs text-ink">
                Descargando imágenes…
              </span>
            </div>
          )}

          <input
            type="range"
            min={0}
            max={100}
            value={position}
            onChange={(e) => setPosition(Number(e.target.value))}
            aria-label="Deslizar para comparar las dos fechas"
            className="absolute inset-0 size-full cursor-ew-resize opacity-0"
          />
        </div>
        <figcaption className="text-xs leading-relaxed text-ink-soft">
          Desliza para comparar.{" "}
          {isFire && (
            <>
              <span className="text-[#d4410b]">Rojo</span>: focos de calor
              detectados ese día.{" "}
            </>
          )}
          Si las nubes tapan la zona, cambia la fecha. VIIRS NOAA-20, vía NASA
          GIBS.
        </figcaption>
      </figure>

      <div className="grid grid-cols-2 gap-4">
        <DayStepper
          label="Antes"
          day={days.before}
          max={shiftDay(days.after, -1)}
          onChange={(before) => setDays((d) => ({ ...d, before }))}
        />
        <DayStepper
          label="Después"
          day={days.after}
          min={shiftDay(days.before, 1)}
          max={maxDay}
          onChange={(after) => setDays((d) => ({ ...d, after }))}
        />
      </div>

      <button
        onClick={() => onShowOnMap(overlayActive ? null : days.after)}
        aria-pressed={overlayActive}
        className={`w-full rounded-[2px] px-3 py-2 text-sm ring-1 ring-ink transition-colors ${
          overlayActive
            ? "bg-ink text-paper"
            : "bg-paper text-ink hover:bg-paper-deep"
        }`}
      >
        {overlayActive
          ? "Quitar la imagen del mapa"
          : `Poner la imagen del ${formatDayMonth(days.after)} en el mapa`}
      </button>
    </section>
  );
}

function DayStepper({
  label,
  day,
  min,
  max,
  onChange,
}: {
  label: string;
  day: string;
  min?: string;
  max: string;
  onChange: (day: string) => void;
}) {
  const prev = shiftDay(day, -1);
  const next = shiftDay(day, 1);
  return (
    <div>
      <div className="text-xs text-ink-soft">{label}</div>
      <div className="flex items-center justify-between border-b border-ink">
        <button
          onClick={() => onChange(prev)}
          disabled={min !== undefined && prev < min}
          aria-label={`${label}: día anterior`}
          className="px-1 py-1 text-ink hover:bg-paper-deep disabled:opacity-30"
        >
          <Chevron dir="left" />
        </button>
        <span className="text-sm text-ink tabular-nums">{formatDate(day)}</span>
        <button
          onClick={() => onChange(next)}
          disabled={next > max}
          aria-label={`${label}: día siguiente`}
          className="px-1 py-1 text-ink hover:bg-paper-deep disabled:opacity-30"
        >
          <Chevron dir="right" />
        </button>
      </div>
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
      <path
        d={dir === "left" ? "M10 3L5 8l5 5" : "M6 3l5 5-5 5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}
