import { NextResponse, type NextRequest } from "next/server";
import { getEventDetail } from "@/lib/eonet/client";

/** Los ids de EONET tienen la forma EONET_12345. */
const ID_PATTERN = /^EONET_\d{1,10}$/;

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/events/[id]">,
) {
  const { id } = await ctx.params;
  if (!ID_PATTERN.test(id)) {
    return NextResponse.json({ error: "id no válido" }, { status: 400 });
  }

  try {
    const event = await getEventDetail(id);
    if (!event) {
      return NextResponse.json(
        { error: "Evento no encontrado" },
        { status: 404 },
      );
    }
    return NextResponse.json(event, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error(`[api/events/${id}]`, error);
    return NextResponse.json(
      { error: "No se pudo obtener el evento" },
      { status: 502 },
    );
  }
}
