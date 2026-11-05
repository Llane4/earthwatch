"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { getCategory } from "@/lib/eonet/categories";
import type {
  EventStatus,
  EventSummary,
  EventsPayload,
} from "@/lib/eonet/types";
import { formatDate, formatRelative, plural } from "@/lib/format";
import { CategorySymbol } from "./CategorySymbol";
import { BackButton, EventDetail } from "./EventDetail";
import type { ImageryOverlay } from "./EventMap";
import { EventList } from "./EventList";
import { Legend } from "./Legend";
import { useEventDetail } from "./useEventDetail";

// MapLibre usa WebGL y `window`: solo se carga en el navegador.
const EventMap = dynamic(() => import("./EventMap"), { ssr: false });

type Result =
  | { key: string; ok: true; data: EventsPayload }
  | { key: string; ok: false; error: string };

const STATUS_ADJECTIVE: Record<EventStatus, [string, string]> = {
  open: ["activo", "activos"],
  closed: ["cerrado", "cerrados"],
  all: ["", ""],
};

export function Explorer() {
  const [status, setStatus] = useState<EventStatus>("open");
  const [days, setDays] = useState(30);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [imagery, setImagery] = useState<ImageryOverlay | null>(null);

  const requestKey = `status=${status}&days=${days}`;
  const loading = result?.key !== `${requestKey}#${reloadToken}`;

  useEffect(() => {
    const key = `${requestKey}#${reloadToken}`;
    const controller = new AbortController();
    fetch(`/api/events?${requestKey}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`);
        setResult({ key, ok: true, data: body as EventsPayload });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key,
          ok: false,
          error: err instanceof Error ? err.message : "Error desconocido",
        });
      });
    return () => controller.abort();
  }, [requestKey, reloadToken]);

  const allEvents = useMemo(
    () => (result?.ok ? result.data.events : []),
    [result],
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of allEvents) {
      map.set(e.categoryId, (map.get(e.categoryId) ?? 0) + 1);
    }
    return map;
  }, [allEvents]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allEvents.filter(
      (e) =>
        !hidden.has(e.categoryId) &&
        (q === "" || e.title.toLowerCase().includes(q)),
    );
  }, [allEvents, hidden, query]);

  const selected = filtered.find((e) => e.id === selectedId);
  const detail = useEventDetail(selected?.id ?? null);

  function toggleCategory(id: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function showOnly(id: string) {
    setHidden(new Set([...counts.keys()].filter((c) => c !== id)));
  }

  const [one, many] = STATUS_ADJECTIVE[status];
  const headline = loading
    ? "Consultando los eventos…"
    : result?.ok
      ? `${plural(filtered.length, "evento")}${
          one ? ` ${filtered.length === 1 ? one : many}` : ""
        } en los últimos ${days} días`
      : "No se pudieron cargar los eventos";

  return (
    <main className="flex h-dvh flex-col bg-paper text-ink md:flex-row">
      <aside className="order-2 h-[52dvh] overflow-y-auto border-t border-ink md:order-1 md:h-full md:w-[380px] md:shrink-0 md:border-t-0 md:border-r">
        {/* Cartela: el bloque de título de una carta impresa. */}
        <header className="m-5 mb-6 border border-ink px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <Mark />
            <h1 className="text-[26px] leading-none font-extrabold tracking-tight font-stretch-expanded">
              EarthWatch
            </h1>
          </div>
          <p className="mt-3 text-[15px] leading-snug" aria-live="polite">
            {headline}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            {result?.ok && result.data.source === "database" && result.data.lastSyncAt
              ? `Datos de NASA EONET, sincronizados ${formatRelative(result.data.lastSyncAt)}.`
              : "Datos de NASA EONET."}
          </p>
        </header>

        {selected && detail?.status === "ok" ? (
          <EventDetail
            event={detail.event}
            overlayDay={imagery?.day ?? null}
            onShowOnMap={(day) =>
              setImagery(
                day ? { day, fires: selected.categoryId === "wildfires" } : null,
              )
            }
            onClose={() => setSelectedId(null)}
          />
        ) : selected ? (
          <DetailPlaceholder
            summary={selected}
            error={detail?.status === "error" ? detail : null}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <>
            <div className="space-y-5 px-5 pb-5">
              <Legend
                status={status}
                days={days}
                hiddenCategories={hidden}
                counts={counts}
                onStatusChange={(s) => {
                  setStatus(s);
                  setSelectedId(null);
                }}
                onDaysChange={(d) => {
                  setDays(d);
                  setSelectedId(null);
                }}
                onToggleCategory={toggleCategory}
                onShowOnly={showOnly}
                onShowAll={() => setHidden(new Set())}
              />
              <label className="block">
                <span className="sr-only">Buscar por nombre</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre, p. ej. Typhoon"
                  className="w-full border-b border-ink bg-transparent py-1.5 text-sm text-ink outline-none placeholder:text-ink-faint focus-visible:outline-none focus-visible:border-b-2"
                />
              </label>
            </div>

            {loading && !result ? (
              <ListSkeleton />
            ) : result && !result.ok ? (
              <div className="space-y-3 px-5 py-6 text-sm">
                <p>
                  No se pudieron cargar los eventos ({result.error}). Comprueba
                  la conexión y vuelve a intentarlo.
                </p>
                <button
                  onClick={() => setReloadToken((t) => t + 1)}
                  className="rounded-[2px] px-3 py-1.5 ring-1 ring-ink hover:bg-paper-deep"
                >
                  Reintentar
                </button>
              </div>
            ) : (
              <EventList events={filtered} onSelect={setSelectedId} />
            )}
          </>
        )}
      </aside>

      <section className="relative order-1 min-h-0 flex-1 md:order-2">
        <EventMap
          events={filtered}
          selectedId={selectedId}
          selectedTrack={
            detail?.status === "ok" ? detail.event.track : undefined
          }
          onSelect={setSelectedId}
          imagery={imagery}
        />
        {imagery && (
          <div className="absolute bottom-8 left-3 flex items-center gap-4 rounded-[2px] bg-paper px-3 py-2 text-sm ring-1 ring-ink">
            <span>Imagen satelital del {formatDate(imagery.day)}</span>
            <button
              onClick={() => setImagery(null)}
              className="underline underline-offset-2 hover:text-ink-soft"
            >
              Quitar
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

/** Marca: un globo con su retícula, como el que acompaña a una carta. */
function Mark() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="12" cy="12" r="10" />
        <ellipse cx="12" cy="12" rx="4.2" ry="10" />
        <path d="M2.6 8.5h18.8M2.6 15.5h18.8" />
      </g>
      <circle cx="16.5" cy="8.5" r="2.6" fill="#d4410b" stroke="#eef2f3" strokeWidth="1.2" />
    </svg>
  );
}

/** Mientras llega el detalle: título y categoría ya se conocen por la lista. */
function DetailPlaceholder({
  summary,
  error,
  onClose,
}: {
  summary: EventSummary;
  error: { error: string; retry: () => void } | null;
  onClose: () => void;
}) {
  const cat = getCategory(summary.categoryId);
  return (
    <div className="space-y-6 px-5 py-5">
      <BackButton onClick={onClose} />
      <header className="space-y-2">
        <p className="flex items-center gap-2 text-sm" style={{ color: cat.color }}>
          <CategorySymbol kind={cat.symbol} color={cat.color} />
          {cat.label}
        </p>
        <h2 className="text-2xl leading-tight font-bold font-stretch-semi-expanded">
          {summary.title}
        </h2>
      </header>
      {error ? (
        <div className="space-y-3 text-sm">
          <p>No se pudo cargar el detalle ({error.error}).</p>
          <button
            onClick={error.retry}
            className="rounded-[2px] px-3 py-1.5 ring-1 ring-ink hover:bg-paper-deep"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="space-y-3" aria-busy="true">
          <div className="h-4 w-4/5 animate-pulse bg-paper-deep" />
          <div className="h-4 w-3/5 animate-pulse bg-paper-deep" />
          <div className="aspect-square w-full animate-pulse bg-paper-deep" />
        </div>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul className="border-t border-rule" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i} className="border-b border-rule px-5 py-3">
          <div className="h-4 w-3/4 animate-pulse bg-paper-deep" />
        </li>
      ))}
    </ul>
  );
}
