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
import type { FeatureCollection, Point } from "geojson";
import {
  CATEGORIES,
  FALLBACK_COLOR,
  symbolImageId,
} from "@/lib/eonet/categories";
import {
  toPointCollection,
  toTrackCollection,
  unwrapPath,
} from "@/lib/eonet/geojson";
import type { EventSummary, LngLat, TrackPoint } from "@/lib/eonet/types";
import { fireHotspotTiles, trueColorTiles } from "@/lib/gibs";
import { rasterizeSymbol } from "@/lib/symbols";

// Mapa base claro de CARTO, recoloreado como carta (ver tintBasemap).
const BASEMAP_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const LABEL_FONT = ["Montserrat SemiBold", "Open Sans Bold"];
const INK = "#14212b";
const PAPER = "#eef2f3";
const NONE = "__none__";

const EMPTY = { type: "FeatureCollection" as const, features: [] };

// El bundler no publica el worker de MapLibre; lo servimos desde public/
// (lo copia scripts/copy-maplibre-worker.mjs en predev/prebuild).
setWorkerUrl(`/maplibre/worker-${getVersion()}.mjs`);

const categoryColor = [
  "match",
  ["get", "categoryId"],
  ...CATEGORIES.flatMap((c) => [c.id, c.color]),
  FALLBACK_COLOR,
] as unknown as ExpressionSpecification;

/** Capas propias: la imagen satelital se inserta por debajo de todas. */
const OWN_LAYERS = new Set([
  "tracks-line",
  "tracks-selected",
  "selected-track-points",
  "selected-track-days",
  "clusters",
  "cluster-count",
  "events-point",
  "events-selected",
]);

export type ImageryOverlay = { day: string; fires: boolean };

type Props = {
  events: EventSummary[];
  selectedId: string | null;
  /** Posiciones con fecha del evento abierto (llegan con el detalle). */
  selectedTrack?: TrackPoint[];
  onSelect: (id: string | null) => void;
  imagery: ImageryOverlay | null;
};

const IMAGERY_LAYERS = ["gibs-fires", "gibs-truecolor"] as const;

const dayLabel = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/**
 * Puntos del recorrido seleccionado. Si se conocen las fechas, el primer
 * punto de cada día lleva una etiqueta, como en una carta de huracanes.
 */
function selectedTrackFeatures(
  path: LngLat[] | undefined,
  track: TrackPoint[] | undefined,
): FeatureCollection<Point, { label: string }> {
  if (track && track.length > 1) {
    let lastDay = "";
    const coords = unwrapPath(track.map((p) => p.coordinates));
    return {
      type: "FeatureCollection",
      features: track.map((p, i) => {
        const day = p.date.slice(0, 10);
        const label = day !== lastDay ? dayLabel.format(new Date(p.date)) : "";
        lastDay = day;
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: coords[i] },
          properties: { label },
        };
      }),
    };
  }
  return {
    type: "FeatureCollection",
    features: unwrapPath(path ?? []).map((coordinates) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates },
      properties: { label: "" },
    })),
  };
}

/** Tierra casi blanca, mar azul de carta, fronteras en tinta suave. */
function tintBasemap(map: MapLibreMap) {
  const paint: [string, Parameters<MapLibreMap["setPaintProperty"]>[1], string][] = [
    ["background", "background-color", "#f6f8f7"],
    ["water", "fill-color", "#c9dce3"],
    ["waterway", "line-color", "#b3ccd6"],
    ["boundary_country_inner", "line-color", "#9aabb4"],
    ["boundary_country_outline", "line-color", "#f6f8f7"],
    ["boundary_state", "line-color", "#cfd8dc"],
  ];
  for (const [layer, prop, value] of paint) {
    if (map.getLayer(layer)) map.setPaintProperty(layer, prop, value);
  }
}

export default function EventMap({
  events,
  selectedId,
  selectedTrack,
  onSelect,
  imagery,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectRef = useRef(onSelect);
  const lastFocusedRef = useRef<string | null>(null);
  const initialFitRef = useRef(false);
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
      tintBasemap(map);

      for (const c of CATEGORIES) {
        map.addImage(symbolImageId(c.id), rasterizeSymbol(c.symbol, c.color), {
          pixelRatio: 2,
        });
      }
      map.addImage("sym-unknown", rasterizeSymbol("dot", FALLBACK_COLOR), {
        pixelRatio: 2,
      });

      map.addSource("tracks", { type: "geojson", data: EMPTY });
      map.addSource("selected-track", { type: "geojson", data: EMPTY });
      map.addSource("events", {
        type: "geojson",
        data: EMPTY,
        cluster: true,
        clusterRadius: 36,
        clusterMaxZoom: 6,
      });

      map.addLayer({
        id: "tracks-line",
        type: "line",
        source: "tracks",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": categoryColor,
          "line-width": 1.6,
          "line-opacity": 0.75,
        },
      });
      map.addLayer({
        id: "tracks-selected",
        type: "line",
        source: "tracks",
        filter: ["==", ["get", "id"], NONE],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": categoryColor, "line-width": 3.2 },
      });
      map.addLayer({
        id: "selected-track-points",
        type: "circle",
        source: "selected-track",
        paint: {
          "circle-radius": ["case", ["!=", ["get", "label"], ""], 3.6, 2.4],
          "circle-color": PAPER,
          "circle-stroke-color": INK,
          "circle-stroke-width": 1.2,
        },
      });
      map.addLayer({
        id: "selected-track-days",
        type: "symbol",
        source: "selected-track",
        filter: ["!=", ["get", "label"], ""],
        layout: {
          "text-field": ["get", "label"],
          "text-font": LABEL_FONT,
          "text-size": 11,
          "text-anchor": "left",
          "text-offset": [0.7, 0],
        },
        paint: {
          "text-color": INK,
          "text-halo-color": PAPER,
          "text-halo-width": 1.6,
        },
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "events",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": PAPER,
          "circle-stroke-color": INK,
          "circle-stroke-width": 1.25,
          "circle-radius": ["step", ["get", "point_count"], 11, 10, 14, 50, 18],
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
          "text-size": 11,
        },
        paint: { "text-color": INK },
      });

      map.addLayer({
        id: "events-selected",
        type: "circle",
        source: "events",
        filter: ["==", ["get", "id"], NONE],
        paint: {
          "circle-radius": 15,
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": INK,
          "circle-stroke-width": 1.5,
        },
      });
      map.addLayer({
        id: "events-point",
        type: "symbol",
        source: "events",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": [
            "coalesce",
            ["image", ["concat", "sym-", ["get", "categoryId"]]],
            ["image", "sym-unknown"],
          ],
          "icon-size": ["interpolate", ["linear"], ["zoom"], 1, 0.75, 7, 1.1],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          // Tormentas y volcanes por encima de los incendios.
          "symbol-sort-key": [
            "match",
            ["get", "categoryId"],
            "severeStorms",
            3,
            "volcanoes",
            2,
            0,
          ],
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

    // La primera vez que llegan datos, encuadra todos los eventos: la vista
    // inicial no debe caer sobre una zona vacía.
    if (!initialFitRef.current && events.length > 0) {
      initialFitRef.current = true;
      const bounds = new LngLatBounds();
      for (const e of events) bounds.extend([e.lng, e.lat]);
      map.fitBounds(bounds, { padding: 48, maxZoom: 4, duration: 0 });
    }
  }, [ready, events]);

  // Resalta el evento seleccionado (y etiqueta sus días si ya hay detalle).
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const selected = events.find((e) => e.id === selectedId);
    const filterId = selected?.id ?? NONE;
    map.setFilter("events-selected", ["==", ["get", "id"], filterId]);
    map.setFilter("tracks-selected", ["==", ["get", "id"], filterId]);
    map
      .getSource<GeoJSONSource>("selected-track")
      ?.setData(
        selected?.path
          ? selectedTrackFeatures(selected.path, selectedTrack)
          : EMPTY,
      );
  }, [ready, events, selectedId, selectedTrack]);

  // Centra el mapa al abrir un evento (una vez por selección).
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const selected = events.find((e) => e.id === selectedId);
    if (!selected) {
      lastFocusedRef.current = null;
      return;
    }
    if (lastFocusedRef.current === selected.id) return;
    lastFocusedRef.current = selected.id;

    if (selected.path) {
      const bounds = new LngLatBounds();
      for (const p of unwrapPath(selected.path)) bounds.extend(p);
      map.fitBounds(bounds, { padding: 80, maxZoom: 6, duration: 1200 });
    } else {
      map.flyTo({
        center: [selected.lng, selected.lat],
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
      .layers.find((l) => l.type === "symbol" && !OWN_LAYERS.has(l.id))?.id;

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
