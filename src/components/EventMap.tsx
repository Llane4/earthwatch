"use client";

import { useEffect, useRef, useState } from "react";
import {
  getVersion,
  LngLatBounds,
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type ExpressionSpecification,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CATEGORIES, FALLBACK_COLOR } from "@/lib/eonet/categories";
import {
  toPointCollection,
  toTrackCollection,
  toTrackPoints,
} from "@/lib/eonet/geojson";
import type { NaturalEvent } from "@/lib/eonet/types";
import { fireHotspotTiles, trueColorTiles } from "@/lib/gibs";

const BASEMAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const LABEL_FONT = ["Montserrat SemiBold", "Open Sans Bold"];
const NONE = "__none__";

const EMPTY = { type: "FeatureCollection" as const, features: [] };

// El bundler no publica el worker de MapLibre; lo servimos desde public/
// (lo copia scripts/copy-maplibre-worker.mjs en predev/prebuild).
setWorkerUrl(`/maplibre/worker-${getVersion()}.mjs`);

const categoryColor: ExpressionSpecification = [
  "match",
  ["get", "categoryId"],
  ...CATEGORIES.flatMap((c) => [c.id, c.color]),
  FALLBACK_COLOR,
] as unknown as ExpressionSpecification;

export type ImageryOverlay = { day: string; fires: boolean };

type Props = {
  events: NaturalEvent[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  imagery: ImageryOverlay | null;
};

const IMAGERY_LAYERS = ["gibs-fires", "gibs-truecolor"] as const;

export default function EventMap({
  events,
  selectedId,
  onSelect,
  imagery,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectRef = useRef(onSelect);
  const lastFocusedRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  // Inicializa el mapa una sola vez.
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: [0, 20],
      zoom: 1.4,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("tracks", { type: "geojson", data: EMPTY });
      map.addSource("selected-track", { type: "geojson", data: EMPTY });
      map.addSource("events", {
        type: "geojson",
        data: EMPTY,
        cluster: true,
        clusterRadius: 40,
        clusterMaxZoom: 6,
      });

      map.addLayer({
        id: "tracks-line",
        type: "line",
        source: "tracks",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": categoryColor,
          "line-width": 1.5,
          "line-opacity": 0.45,
        },
      });
      map.addLayer({
        id: "tracks-selected",
        type: "line",
        source: "tracks",
        filter: ["==", ["get", "id"], NONE],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": categoryColor, "line-width": 3.5 },
      });
      map.addLayer({
        id: "selected-track-points",
        type: "circle",
        source: "selected-track",
        paint: {
          "circle-radius": 3,
          "circle-color": "#0b1020",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
        },
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "events",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#e2e8f0",
          "circle-opacity": 0.9,
          "circle-stroke-color": "rgba(226,232,240,0.25)",
          "circle-stroke-width": 6,
          "circle-radius": [
            "step",
            ["get", "point_count"],
            13,
            10,
            17,
            50,
            22,
          ],
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "events",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": LABEL_FONT,
          "text-size": 12,
        },
        paint: { "text-color": "#0b1020" },
      });

      map.addLayer({
        id: "events-point",
        type: "circle",
        source: "events",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": categoryColor,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 5, 8, 8],
          "circle-stroke-color": "#0b1020",
          "circle-stroke-width": 1.5,
        },
      });
      map.addLayer({
        id: "events-selected",
        type: "circle",
        source: "events",
        filter: ["==", ["get", "id"], NONE],
        paint: {
          "circle-radius": 13,
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });

      setReady(true);
    });

    const interactive = ["events-point", "clusters"];
    for (const layer of interactive) {
      map.on("mouseenter", layer, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", layer, () => {
        map.getCanvas().style.cursor = "";
      });
    }

    map.on("click", "events-point", (e) => {
      const id = e.features?.[0]?.properties?.id;
      if (typeof id === "string") onSelectRef.current(id);
    });

    map.on("click", "clusters", async (e) => {
      const feature = e.features?.[0];
      if (!feature || feature.geometry.type !== "Point") return;
      const source = map.getSource<GeoJSONSource>("events");
      if (!source) return;
      const zoom = await source.getClusterExpansionZoom(
        feature.properties.cluster_id,
      );
      map.easeTo({
        center: feature.geometry.coordinates as [number, number],
        zoom,
      });
    });

    map.on("click", (e) => {
      const hits = map.queryRenderedFeatures(e.point, { layers: interactive });
      if (hits.length === 0) onSelectRef.current(null);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sincroniza los datos del mapa con los eventos filtrados.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.getSource<GeoJSONSource>("events")?.setData(toPointCollection(events));
    map.getSource<GeoJSONSource>("tracks")?.setData(toTrackCollection(events));
  }, [ready, events]);

  // Resalta el evento seleccionado y centra el mapa en él.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    const selected = events.find((e) => e.id === selectedId);
    const filterId = selected?.id ?? NONE;
    map.setFilter("events-selected", ["==", ["get", "id"], filterId]);
    map.setFilter("tracks-selected", ["==", ["get", "id"], filterId]);
    map
      .getSource<GeoJSONSource>("selected-track")
      ?.setData(toTrackPoints(selected));

    if (!selected || lastFocusedRef.current === selected.id) {
      if (!selected) lastFocusedRef.current = null;
      return;
    }
    lastFocusedRef.current = selected.id;

    if (selected.track.length > 1) {
      const bounds = new LngLatBounds();
      for (const p of selected.track) bounds.extend(p.coordinates);
      map.fitBounds(bounds, { padding: 80, maxZoom: 6, duration: 1200 });
    } else {
      map.flyTo({
        center: selected.latest.coordinates,
        zoom: Math.max(map.getZoom(), 5),
        duration: 1200,
      });
    }
  }, [ready, events, selectedId]);

  // Capa satelital de GIBS bajo las etiquetas del mapa base y los eventos.
  const imageryDay = imagery?.day ?? null;
  const imageryFires = imagery?.fires ?? false;
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    for (const id of IMAGERY_LAYERS) {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    }
    if (!imageryDay) return;

    // Primera capa de texto del mapa base: la imagen va debajo de ella.
    const firstLabel = map
      .getStyle()
      .layers.find((l) => l.type === "symbol" && !l.id.startsWith("cluster"))?.id;

    map.addSource("gibs-truecolor", {
      type: "raster",
      tiles: [trueColorTiles(imageryDay)],
      tileSize: 256,
      maxzoom: 9,
      attribution: "Imágenes: NASA GIBS / VIIRS NOAA-20",
    });
    map.addLayer(
      { id: "gibs-truecolor", type: "raster", source: "gibs-truecolor" },
      firstLabel,
    );

    if (imageryFires) {
      map.addSource("gibs-fires", {
        type: "raster",
        tiles: [fireHotspotTiles(imageryDay)],
        tileSize: 256,
      });
      map.addLayer(
        { id: "gibs-fires", type: "raster", source: "gibs-fires" },
        firstLabel,
      );
    }
  }, [ready, imageryDay, imageryFires]);

  // MapLibre añade `.maplibregl-map { position: relative }` al contenedor y,
  // al no estar en una capa CSS, gana a las utilidades de Tailwind v4.
  // Por eso el posicionamiento va en un div externo y el mapa solo ocupa 100%.
  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
