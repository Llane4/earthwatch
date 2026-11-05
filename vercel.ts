import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  // Respaldo diario (compatible con el plan Hobby). Entre medias, /api/events
  // refresca la base en segundo plano si los datos tienen más de 30 minutos.
  crons: [{ path: "/api/cron/sync", schedule: "0 6 * * *" }],
};
