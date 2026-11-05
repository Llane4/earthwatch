import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { EVENTS_TAG } from "@/lib/eonet/client";
import { syncEvents } from "@/lib/sync";

/**
 * Lo llama Vercel Cron (ver vercel.ts). Vercel envía
 * `Authorization: Bearer $CRON_SECRET` automáticamente.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await syncEvents({ trigger: "cron", days: 30 });
    if (!result.skipped) revalidateTag(EVENTS_TAG, "max");
    return NextResponse.json(result);
  } catch (error) {
    console.error("[cron/sync]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 },
    );
  }
}
