"use client";

import { getCategory } from "@/lib/eonet/categories";
import type { NaturalEvent } from "@/lib/eonet/types";
import { formatDate } from "@/lib/format";

type Props = {
  events: NaturalEvent[];
  onSelect: (id: string) => void;
};

export function EventList({ events, onSelect }: Props) {
  if (events.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-slate-500">
        No hay eventos con estos filtros.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-white/5">
      {events.map((e) => {
        const cat = getCategory(e.category.id);
        return (
          <li key={e.id}>
            <button
              onClick={() => onSelect(e.id)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-white/5"
            >
              <span
                className="mt-1.5 size-2 shrink-0 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-slate-100">
                  {e.title}
                </span>
                <span className="block text-xs text-slate-500">
                  {cat.label} · {formatDate(e.latest.date)}
                  {e.track.length > 1 && ` · ${e.track.length} posiciones`}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
