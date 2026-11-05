/**
 * MapLibre 6 carga su worker desde un archivo aparte, resuelto respecto a
 * su propio módulo. Al empaquetarlo Next.js ese archivo no se publica, así
 * que lo copiamos a public/ (con la versión en el nombre, para que una
 * actualización no use un worker viejo en caché) y lo indicamos con
 * setWorkerUrl() en EventMap.tsx. Se ejecuta en `predev` y `prebuild`.
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const pkgPath = require.resolve("maplibre-gl/package.json");
const { version } = JSON.parse(readFileSync(pkgPath, "utf8"));

const source = join(dirname(pkgPath), "dist", "maplibre-gl-worker.mjs");
const outDir = join(process.cwd(), "public", "maplibre");
const target = `worker-${version}.mjs`;

mkdirSync(outDir, { recursive: true });
for (const file of readdirSync(outDir)) {
  if (file !== target) rmSync(join(outDir, file));
}
copyFileSync(source, join(outDir, target));
console.log(`MapLibre worker → public/maplibre/${target}`);
