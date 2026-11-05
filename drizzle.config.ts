import { defineConfig } from "drizzle-kit";

// drizzle-kit no carga .env.local: usa los scripts `db:*` de package.json,
// que lo cargan con dotenv-cli. Para migraciones se usa la conexión directa.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
});
