import { after, NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { hasDatabase } from "@/db";
import { EVENTS_TAG, getEvents } from "@/lib/eonet/client";
import type { EventStatus } from "@/lib/eonet/types";
import { lastSuccessfulSync, syncEvents } from "@/lib/sync";

const STATUSES: EventStatus[] = ["open", "closed", "all"];

/** Si la última sincronización es más vieja que esto, se refresca en segundo plano. */
const STALE_AFTER_MS = 30 * 60_000;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const status = (params.get("status") ?? "open") as EventStatus;
  if (!STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "status debe ser open, closed o all" },
      { status: 400 },
    );
  }

  const days = Number(params.get("days") ?? "30");
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    return NextResponse.json(
      { error: "days debe ser un entero entre 1 y 365" },
      { status: 400 },
    );
  }

  try {
    const [payload, lastSync] = await Promise.all([
      getEvents(status, days),
      hasDatabase() ? lastSuccessfulSync().catch(() => null) : null,
    ]);

    // Stale-while-revalidate propio: respondemos ya y sincronizamos después.
    if (
      hasDatabase() &&
      (!lastSync || Date.now() - lastSync.getTime() > STALE_AFTER_MS)
    ) {
      after(async () => {
        try {
          const result = await syncEvents({ trigger: "lazy" });
          if (!result.skipped) revalidateTag(EVENTS_TAG, "max");
        } catch (error) {
          console.error("[api/events] sincronización en segundo plano", error);
        }
      });
    }

    return NextResponse.json(
      { ...payload, lastSyncAt: lastSync?.toISOString() ?? null },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error("[api/events]", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los eventos" },
      { status: 502 },
    );
  }
}
