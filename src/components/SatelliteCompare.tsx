"use client";

import { useState } from "react";
import type { NaturalEvent } from "@/lib/eonet/types";
import { formatDate } from "@/lib/format";
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
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs text-slate-400">Imagen satelital</h3>
        <span className="text-[11px] text-slate-500">NASA GIBS · VIIRS NOAA-20</span>
      </div>

      <div className="relative aspect-square overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10 select-none">
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen externa dinámica de GIBS */}
        <img
          src={afterUrl}
          alt={`Imagen satelital de ${event.title} el ${days.after}`}
          onLoad={() => markLoaded(afterUrl)}
          className="absolute inset-0 size-full object-cover"
          draggable={false}
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen externa dinámica de GIBS */}
        <img
          src={beforeUrl}
          alt={`Imagen satelital de la misma zona el ${days.before}`}
          onLoad={() => markLoaded(beforeUrl)}
          className="absolute inset-0 size-full object-cover"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
          draggable={false}
        />

        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.6)]"
          style={{ left: `${position}%` }}
        >
          <span className="absolute top-1/2 left-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xs text-slate-900 shadow">
            ⇆
          </span>
        </div>

        <span className="pointer-events-none absolute top-2 left-2 rounded bg-slate-950/75 px-1.5 py-0.5 text-[11px] text-slate-200">
          Antes
        </span>
        <span className="pointer-events-none absolute top-2 right-2 rounded bg-slate-950/75 px-1.5 py-0.5 text-[11px] text-slate-200">
          Después
        </span>

        {loading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/40">
            <span className="size-5 animate-spin rounded-full border-2 border-slate-400 border-t-white" />
          </div>
        )}

        <input
          type="range"
          min={0}
          max={100}
          value={position}
          onChange={(e) => setPosition(Number(e.target.value))}
          aria-label="Deslizar para comparar antes y después"
          className="absolute inset-0 size-full cursor-ew-resize opacity-0"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
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

      <p className="text-[11px] leading-relaxed text-slate-500">
        {isFire && (
          <>
            <span className="text-red-400">■</span> Focos de calor detectados
            ese día.{" "}
          </>
        )}
        Si las nubes tapan la zona, prueba con otra fecha.
      </p>

      <button
        onClick={() => onShowOnMap(overlayActive ? null : days.after)}
        className={`w-full rounded-lg px-3 py-2 text-sm transition ${
          overlayActive
            ? "bg-sky-400/20 text-sky-200 ring-1 ring-sky-400/40"
            : "bg-white/10 text-slate-100 hover:bg-white/15"
        }`}
      >
        {overlayActive
          ? "Quitar capa satelital del mapa"
          : `Ver capa del ${formatDate(days.after)} en el mapa`}
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
    <div className="rounded-lg bg-white/5 p-2">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="mt-0.5 flex items-center justify-between gap-1">
        <button
          onClick={() => onChange(prev)}
          disabled={min !== undefined && prev < min}
          aria-label={`${label}: día anterior`}
          className="rounded px-1.5 text-slate-300 hover:bg-white/10 disabled:opacity-30"
        >
          ‹
        </button>
        <span className="text-xs tabular-nums text-slate-100">
          {formatDate(day)}
        </span>
        <button
          onClick={() => onChange(next)}
          disabled={next > max}
          aria-label={`${label}: día siguiente`}
          className="rounded px-1.5 text-slate-300 hover:bg-white/10 disabled:opacity-30"
        >
          ›
        </button>
      </div>
    </div>
  );
}
