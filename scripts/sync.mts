/**
 * Sincronización manual / carga inicial.
 *   npm run db:sync            → últimos 30 días
 *   npm run db:sync -- 365     → último año (backfill)
 */
import { syncEvents } from "@/lib/sync";

const days = Number(process.argv[2] ?? 30);
if (!Number.isInteger(days) || days < 1 || days > 365) {
  console.error("Uso: npm run db:sync -- <días 1-365>");
  process.exit(1);
}

console.log(`Sincronizando EONET (últimos ${days} días)…`);
const result = await syncEvents({ trigger: "manual", days });
console.log(result);
