"use client";

import { useEffect, useRef, useState } from "react";
import type { NaturalEvent } from "@/lib/eonet/types";

type Entry =
  | { status: "ok"; event: NaturalEvent }
  | { status: "error"; error: string; attempt: number };

export type DetailState =
  | { status: "loading" }
  | { status: "ok"; event: NaturalEvent }
  | { status: "error"; error: string; retry: () => void };

/**
 * Pide el detalle completo de un evento a /api/events/[id] y lo guarda en
 * memoria: volver a abrir un evento ya visto es instantáneo.
 */
export function useEventDetail(id: string | null): DetailState | null {
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [attempt, setAttempt] = useState(0);
  const entriesRef = useRef(entries);

  useEffect(() => {
    entriesRef.current = entries;
  });

  useEffect(() => {
    if (!id || entriesRef.current[id]?.status === "ok") return;
    const controller = new AbortController();
    fetch(`/api/events/${encodeURIComponent(id)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`);
        setEntries((prev) => ({
          ...prev,
          [id]: { status: "ok", event: body as NaturalEvent },
        }));
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setEntries((prev) => ({
          ...prev,
          [id]: {
            status: "error",
            error: err instanceof Error ? err.message : "Error desconocido",
            attempt,
          },
        }));
      });
    return () => controller.abort();
  }, [id, attempt]);

  if (!id) return null;
  const entry = entries[id];
  if (entry?.status === "ok") return entry;
  if (entry?.status === "error" && entry.attempt === attempt) {
    return {
      status: "error",
      error: entry.error,
      retry: () => setAttempt((a) => a + 1),
    };
  }
  return { status: "loading" };
}
