import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta la variable de entorno DATABASE_URL");
  return drizzle(neon(url), { schema });
}

let db: ReturnType<typeof createDb> | null = null;

/** Conexión perezosa: no falla en `next build` si aún no hay variables. */
export function getDb() {
  db ??= createDb();
  return db;
}

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export { schema };
