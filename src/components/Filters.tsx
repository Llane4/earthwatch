"use client";

import { CATEGORIES } from "@/lib/eonet/categories";
import type { EventStatus } from "@/lib/eonet/types";

export const DAY_OPTIONS = [7, 30, 90, 180] as const;

const STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: "open", label: "Activos" },
  { value: "closed", label: "Cerrados" },
  { value: "all", label: "Todos" },
];

type Props = {
  status: EventStatus;
  days: number;
  hiddenCategories: ReadonlySet<string>;
  counts: ReadonlyMap<string, number>;
  onStatusChange: (status: EventStatus) => void;
  onDaysChange: (days: number) => void;
  onToggleCategory: (id: string) => void;
  onShowOnly: (id: string) => void;
  onShowAll: () => void;
};

export function Filters({
  status,
  days,
  hiddenCategories,
  counts,
  onStatusChange,
  onDaysChange,
  onToggleCategory,
  onShowOnly,
  onShowAll,
}: Props) {
  const visible = CATEGORIES.filter((c) => (counts.get(c.id) ?? 0) > 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div
          role="radiogroup"
          aria-label="Estado"
          className="flex flex-1 rounded-lg bg-white/5 p-1 text-xs"
        >
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              role="radio"
              aria-checked={status === opt.value}
              onClick={() => onStatusChange(opt.value)}
              className={`flex-1 rounded-md px-2 py-1.5 transition ${
                status === opt.value
                  ? "bg-white/15 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="days">
          Rango de días
        </label>
        <select
          id="days"
          value={days}
          onChange={(e) => onDaysChange(Number(e.target.value))}
          className="rounded-lg border-0 bg-white/5 px-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-white/30"
        >
          {DAY_OPTIONS.map((d) => (
            <option key={d} value={d} className="bg-slate-900">
              Últimos {d} días
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>Categorías</span>
          {hiddenCategories.size > 0 && (
            <button onClick={onShowAll} className="hover:text-white">
              Mostrar todas
            </button>
          )}
        </div>
        {visible.length === 0 ? (
          <p className="text-xs text-slate-500">Sin categorías en este rango.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {visible.map((c) => {
              const active = !hiddenCategories.has(c.id);
              return (
                <li key={c.id}>
                  <button
                    onClick={() => onToggleCategory(c.id)}
                    onDoubleClick={() => onShowOnly(c.id)}
                    aria-pressed={active}
                    title="Clic: mostrar/ocultar · Doble clic: solo esta"
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                      active
                        ? "border-white/15 bg-white/10 text-slate-100"
                        : "border-white/5 text-slate-500 line-through"
                    }`}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{
                        backgroundColor: c.color,
                        opacity: active ? 1 : 0.35,
                      }}
                    />
                    {c.label}
                    <span className="tabular-nums text-slate-400">
                      {counts.get(c.id)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
