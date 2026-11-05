"use client";

import { CATEGORIES } from "@/lib/eonet/categories";
import type { EventStatus } from "@/lib/eonet/types";
import { CategorySymbol } from "./CategorySymbol";

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

/** Leyenda de la carta: cada símbolo es también un filtro. */
export function Legend({
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
  const present = CATEGORIES.filter((c) => (counts.get(c.id) ?? 0) > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div role="radiogroup" aria-label="Estado de los eventos" className="flex gap-4">
          {STATUS_OPTIONS.map((opt) => {
            const active = status === opt.value;
            return (
              <button
                key={opt.value}
                role="radio"
                aria-checked={active}
                onClick={() => onStatusChange(opt.value)}
                className={`border-b-2 pb-1 text-sm transition-colors ${
                  active
                    ? "border-ink font-semibold text-ink"
                    : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-ink-soft">
          <span className="sr-only">Periodo</span>
          <select
            value={days}
            onChange={(e) => onDaysChange(Number(e.target.value))}
            className="cursor-pointer border-b border-ink-faint bg-transparent pb-1 text-sm text-ink outline-none"
          >
            {DAY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                Últimos {d} días
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 flex w-full items-baseline justify-between text-sm font-semibold font-stretch-semi-expanded">
          Leyenda
          {hiddenCategories.size > 0 && (
            <button
              onClick={onShowAll}
              className="text-xs font-normal font-stretch-normal text-ink-soft underline underline-offset-2 hover:text-ink"
            >
              Mostrar todo
            </button>
          )}
        </legend>
        {present.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Sin eventos en este periodo. Prueba con un rango más largo.
          </p>
        ) : (
          <ul>
            {present.map((c) => {
              const visible = !hiddenCategories.has(c.id);
              return (
                <li key={c.id}>
                  <button
                    onClick={() => onToggleCategory(c.id)}
                    onDoubleClick={() => onShowOnly(c.id)}
                    aria-pressed={visible}
                    title="Clic para ocultar o mostrar. Doble clic para ver solo esta categoría."
                    className="group flex w-full items-center gap-2.5 py-1 text-left"
                  >
                    <CategorySymbol
                      kind={c.symbol}
                      color={c.color}
                      muted={!visible}
                    />
                    <span
                      className={`flex-1 text-sm ${
                        visible ? "text-ink" : "text-ink-faint line-through"
                      } group-hover:underline group-hover:underline-offset-2`}
                    >
                      {c.label}
                    </span>
                    <span
                      className={`text-sm tabular-nums ${
                        visible ? "text-ink" : "text-ink-faint"
                      }`}
                    >
                      {counts.get(c.id)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>
    </div>
  );
}
