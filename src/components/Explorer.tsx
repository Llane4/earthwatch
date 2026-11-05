"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { getCategory } from "@/lib/eonet/categories";
import type {
  EventStatus,
  EventSummary,
  EventsPayload,
} from "@/lib/eonet/types";
import { formatDate, formatDateTime } from "@/lib/format";
import type { ImageryOverlay } from "./EventMap";
import { EventDetail } from "./EventDetail";
import { EventList } from "./EventList";
import { Filters } from "./Filters";
import { useEventDetail } from "./useEventDetail";

// MapLibre usa WebGL y `window`: solo se carga en el navegador.
const EventMap = dynamic(() => import("./EventMap"), { ssr: false });

type Result =
  | { key: string; ok: true; data: EventsPayload }
  | { key: string; ok: false; error: string };

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

  return (
    <main className="flex h-dvh flex-col bg-slate-950 text-slate-100 md:flex-row">
      <aside className="order-2 flex h-[48dvh] flex-col border-t border-white/10 md:order-1 md:h-full md:w-96 md:border-t-0 md:border-r">
        <header className="space-y-4 border-b border-white/10 p-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">EarthWatch</h1>
            <p className="text-xs text-slate-400">
              Eventos naturales en tiempo casi real · NASA EONET
            </p>
          </div>
          <Filters
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
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre…"
            className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-white/30"
          />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {selected && detail?.status === "ok" ? (
            <EventDetail
              event={detail.event}
              overlayDay={imagery?.day ?? null}
              onShowOnMap={(day) =>
                setImagery(
                  day
                    ? { day, fires: selected.categoryId === "wildfires" }
                    : null,
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
          ) : loading && !result ? (
            <ListSkeleton />
          ) : result && !result.ok ? (
            <div className="space-y-3 px-4 py-8 text-center text-sm">
              <p className="text-rose-300">{result.error}</p>
              <button
                onClick={() => setReloadToken((t) => t + 1)}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-slate-100 hover:bg-white/15"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <EventList events={filtered} onSelect={setSelectedId} />
          )}
        </div>
      </aside>

      <section className="relative order-1 min-h-0 flex-1 md:order-2">
        <EventMap
          events={filtered}
          selectedId={selectedId}
          onSelect={setSelectedId}
          imagery={imagery}
        />
        {imagery && (
          <button
            onClick={() => setImagery(null)}
            className="absolute bottom-8 left-3 flex items-center gap-2 rounded-lg bg-slate-950/85 px-3 py-2 text-xs text-slate-200 ring-1 ring-sky-400/40 backdrop-blur hover:bg-slate-900"
          >
            <span className="size-2 rounded-full bg-sky-400" />
            Capa satelital · {formatDate(imagery.day)}
            <span aria-hidden className="text-slate-400">✕</span>
            <span className="sr-only">Quitar capa satelital</span>
          </button>
        )}
        <div className="pointer-events-none absolute top-3 left-3 rounded-lg bg-slate-950/80 px-3 py-2 text-xs text-slate-300 ring-1 ring-white/10 backdrop-blur">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="size-3 animate-spin rounded-full border-2 border-slate-500 border-t-white" />
              Consultando EONET…
            </span>
          ) : result?.ok ? (
            <>
              <span className="font-medium text-white tabular-nums">
                {filtered.length}
              </span>{" "}
              eventos ·{" "}
              {result.data.source === "database" && result.data.lastSyncAt
                ? `sincronizado ${formatDateTime(result.data.lastSyncAt)}`
                : `EONET en vivo · ${formatDateTime(result.data.fetchedAt)}`}
            </>
          ) : (
            "Sin datos"
          )}
        </div>
      </section>
    </main>
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
    <div className="space-y-5 px-4 py-4">
      <button
        onClick={onClose}
        className="text-xs text-slate-400 transition hover:text-white"
      >
        ← Volver a la lista
      </button>
      <div className="space-y-2">
        <span
          className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium text-slate-950"
          style={{ backgroundColor: cat.color }}
        >
          {cat.label}
        </span>
        <h2 className="text-lg font-semibold leading-snug text-white">
          {summary.title}
        </h2>
      </div>
      {error ? (
        <div className="space-y-3 text-sm">
          <p className="text-rose-300">{error.error}</p>
          <button
            onClick={error.retry}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-slate-100 hover:bg-white/15"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3" aria-busy="true">
          <div className="col-span-2 h-14 animate-pulse rounded-lg bg-white/5" />
          <div className="col-span-2 h-14 animate-pulse rounded-lg bg-white/5" />
          <div className="h-14 animate-pulse rounded-lg bg-white/5" />
          <div className="h-14 animate-pulse rounded-lg bg-white/5" />
          <div className="col-span-2 aspect-square animate-pulse rounded-lg bg-white/5" />
        </div>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul className="space-y-3 p-4" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
      ))}
    </ul>
  );
}
