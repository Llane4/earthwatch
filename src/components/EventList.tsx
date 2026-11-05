"use client";

import { getCategory } from "@/lib/eonet/categories";
import type { EventSummary } from "@/lib/eonet/types";
import { formatDayMonth } from "@/lib/format";
import { CategorySymbol } from "./CategorySymbol";

type Props = {
  events: EventSummary[];
  onSelect: (id: string) => void;
};

export function EventList({ events, onSelect }: Props) {
  if (events.length === 0) {
    return (
      <p className="px-5 py-8 text-sm text-ink-soft">
        Ningún evento coincide con la búsqueda o la leyenda. Borra la búsqueda
        o pulsa «Mostrar todo».
      </p>
    );
  }

  return (
    <ul className="border-t border-rule">
      {events.map((e) => {
        const cat = getCategory(e.categoryId);
        return (
          <li key={e.id} className="border-b border-rule">
            <button
              onClick={() => onSelect(e.id)}
              className="grid w-full grid-cols-[18px_1fr_auto] items-start gap-x-3 px-5 py-2.5 text-left transition-colors hover:bg-paper-deep"
            >
              <CategorySymbol
                kind={cat.symbol}
                color={cat.color}
                className="mt-0.5"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm text-ink">
                  {e.title}
                </span>
                {e.points > 1 && (
                  <span className="block text-xs text-ink-soft">
                    {e.points} posiciones registradas
                  </span>
                )}
              </span>
              <time
                dateTime={e.date}
                className="pt-px text-xs text-ink-soft tabular-nums"
              >
                {formatDayMonth(e.date)}
              </time>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
