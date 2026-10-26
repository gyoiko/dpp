"use client";

import { geoGraticule10, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import landTopology from "world-atlas/land-110m.json";
import { Maximize2, Minus, Pause, Play, Plus, RotateCcw, Route } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type MapPoint = {
  id: string;
  label: string;
  coordinates: [number, number];
  verified: boolean;
};

export type MapStage = {
  id: string;
  step: number;
  title: string;
  location: string;
  coordinates: [number, number];
  documented: boolean;
  points: MapPoint[];
};

type TrackMapProps = { stages: MapStage[]; activeId: string | null; onSelect: (stage: MapStage) => void };

const WIDTH = 640;
const HEIGHT = 300;
const VIEW_PADDING = 38;
const MARKER_GAP = 24;
const round = (value: number, precision = 3) => Number(value.toFixed(precision));
const projection = geoNaturalEarth1().fitExtent([[8, 8], [WIDTH - 8, HEIGHT - 8]], { type: "Sphere" });
const path = geoPath(projection);
const land = feature(landTopology as never, (landTopology as { objects: { land: never } }).objects.land);
const worldPath = path(land) ?? "";
const spherePath = path({ type: "Sphere" }) ?? "";
const gridPath = path(geoGraticule10()) ?? "";
const EMPTY_STAGE: MapStage = {
  id: "empty",
  step: 1,
  title: "No documented stage",
  location: "—",
  coordinates: [0, 0],
  documented: false,
  points: [],
};

function routeCoordinates(points: [number, number][]) {
  const coordinates: [number, number][] = [];
  points.forEach((point, index) => {
    if (index === 0) {
      coordinates.push(point);
      return;
    }
    const [previousLon, previousLat] = points[index - 1];
    const [longitude, latitude] = point;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(longitude - previousLon), Math.abs(latitude - previousLat))));
    for (let step = 1; step <= steps; step += 1) {
      coordinates.push([
        previousLon + ((longitude - previousLon) * step) / steps,
        previousLat + ((latitude - previousLat) * step) / steps,
      ]);
    }
  });
  return coordinates;
}

const routeLine = (points: [number, number][]) =>
  points.length < 2 ? "" : path({ type: "LineString", coordinates: routeCoordinates(points) }) ?? "";

export default function TrackMap({ stages, activeId, onSelect }: TrackMapProps) {
  const journey = useMemo(() => (stages.length ? stages : [EMPTY_STAGE]), [stages]);
  const markers = useMemo(
    () => journey.flatMap((stage, stageIndex) => stage.points.map((point) => ({ stage, stageIndex, point }))),
    [journey],
  );
  const view = useMemo(() => {
    const points = (markers.length ? markers.map((marker) => marker.point.coordinates) : journey.map((stage) => stage.coordinates))
      .map((coordinates) => (projection(coordinates) ?? [WIDTH / 2, HEIGHT / 2]).map((value) => round(value)) as [number, number]);
    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const zoom = Math.max(
      1,
      Math.min(
        2.4,
        (WIDTH - VIEW_PADDING * 2) / Math.max(1, maxX - minX),
        (HEIGHT - VIEW_PADDING * 2) / Math.max(1, maxY - minY),
      ),
    );
    return { center: [round((minX + maxX) / 2), round((minY + maxY) / 2)] as [number, number], zoom: round(zoom) };
  }, [journey, markers]);
  const defaultZoom = view.zoom;
  const [isPlaying, setIsPlaying] = useState(false);
  const [tourIndex, setTourIndex] = useState(() => Math.max(0, markers.findIndex((marker) => marker.stage.id === activeId)));
  const [zoom, setZoom] = useState(defaultZoom);
  const [focusMode, setFocusMode] = useState<"route" | "stage">("route");
  const activeIndex = Math.max(0, journey.findIndex((stage) => stage.id === activeId));
  const activeStage = journey[activeIndex] ?? journey[0];
  const syncedTourIndex = useMemo(() => {
    if (isPlaying) return tourIndex;
    if (markers[tourIndex]?.stage.id === activeId) return tourIndex;
    const first = markers.findIndex((marker) => marker.stage.id === activeId);
    return first >= 0 ? first : tourIndex;
  }, [activeId, isPlaying, markers, tourIndex]);
  const currentStop = markers[syncedTourIndex] ?? markers[0];
  const lastStep = journey[journey.length - 1]?.step ?? journey.length;
  const focusCoordinates = currentStop?.point.coordinates ?? activeStage.coordinates;
  const projectedActive = projection(focusCoordinates) ?? [WIDTH / 2, HEIGHT / 2];
  const activePoint = [round(projectedActive[0]), round(projectedActive[1])] as [number, number];
  const focusPoint = focusMode === "route" ? view.center : activePoint;

  const markerOffsets = useMemo(() => {
    const points = markers.map((marker) =>
      (projection(marker.point.coordinates) ?? [WIDTH / 2, HEIGHT / 2]).map((value) => round(value)),
    );
    const offsets = points.map(() => [0, 0]);
    for (let pass = 0; pass < 40; pass += 1) {
      let moved = false;
      for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
          const dx = points[i][0] + offsets[i][0] - (points[j][0] + offsets[j][0]);
          const dy = points[i][1] + offsets[i][1] - (points[j][1] + offsets[j][1]);
          const distance = Math.hypot(dx, dy);
          if (distance >= MARKER_GAP) continue;
          const angle = distance < 0.01 ? i * 2.399963 + j : Math.atan2(dy, dx);
          const push = (MARKER_GAP - distance) / 2 + 0.5;
          offsets[i][0] += Math.cos(angle) * push;
          offsets[i][1] += Math.sin(angle) * push;
          offsets[j][0] -= Math.cos(angle) * push;
          offsets[j][1] -= Math.sin(angle) * push;
          moved = true;
        }
      }
      if (!moved) break;
    }
    return offsets.map(([x, y]) => [round(x), round(y)]);
  }, [markers]);

  const routePoints = useMemo(() => markers.map((marker) => marker.point.coordinates), [markers]);
  const routePath = useMemo(() => routeLine(routePoints), [routePoints]);
  const completedPath = useMemo(
    () => routeLine(routePoints.slice(0, syncedTourIndex + 1)),
    [routePoints, syncedTourIndex],
  );

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setTourIndex((current) => {
        if (current >= markers.length - 1) {
          setIsPlaying(false);
          setFocusMode("route");
          setZoom(defaultZoom);
          return current;
        }
        const next = current + 1;
        onSelect(markers[next].stage);
        return next;
      });
    }, 2400);
    return () => window.clearInterval(timer);
  }, [defaultZoom, isPlaying, markers, onSelect]);

  const playJourney = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (!markers.length) return;
    const canResume = syncedTourIndex > 0 && syncedTourIndex < markers.length - 1 && activeId === markers[syncedTourIndex].stage.id;
    const start = canResume ? syncedTourIndex : 0;
    setTourIndex(start);
    onSelect(markers[start].stage);
    setFocusMode("stage");
    setZoom(3.2);
    setIsPlaying(true);
  };

  const selectMarker = (index: number) => {
    const marker = markers[index];
    if (!marker) return;
    setIsPlaying(false);
    setTourIndex(index);
    setFocusMode("stage");
    setZoom(3.2);
    onSelect(marker.stage);
  };

  const transform =
    zoom === 1
      ? "translate(0px, 0px) scale(1)"
      : `translate(${WIDTH / 2}px, ${HEIGHT / 2}px) scale(${zoom}) translate(${-focusPoint[0]}px, ${-focusPoint[1]}px)`;

  return (
    <section className="track-map-shell" aria-label="World map of the documented product journey">
      <div className="world-map">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="World map showing the documented supply chain route">
          <g className="world-viewport" style={{ transform }}>
            <path className="world-ocean" d={spherePath} />
            <path className="world-grid" d={gridPath} />
            <path className="world-land" d={worldPath} />
            <path className="world-route-shadow" d={routePath} />
            <path className="world-route" d={routePath} />
            <path className="world-route-complete-glow" d={completedPath} />
            <path className="world-route-complete" d={completedPath} />
            {markers.map(({ stage, point: mapPoint }, index) => {
              const projected = projection(mapPoint.coordinates) ?? [0, 0];
              const point = [round(projected[0]), round(projected[1])] as [number, number];
              const [offsetX, offsetY] = markerOffsets[index];
              const active = stage.id === activeId;
              const current = index === syncedTourIndex;
              const displaced = offsetX !== 0 || offsetY !== 0;
              return (
                <g
                  key={`${stage.id}-${mapPoint.id}`}
                  className={`world-marker ${active ? "active" : ""} ${stage.documented && mapPoint.verified ? "" : "undocumented"}`}
                  transform={`translate(${point[0]} ${point[1]})`}
                  onClick={() => selectMarker(index)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Stage ${stage.step}: ${stage.title}, ${mapPoint.label}`}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") selectMarker(index);
                  }}
                >
                  <g className="marker-pin" transform={`scale(${1 / zoom})`}>
                    {displaced && <line className="marker-leader" x1="0" y1="0" x2={offsetX} y2={offsetY} />}
                    <g transform={`translate(${offsetX} ${offsetY})`}>
                      {current && <circle className="marker-radar" r="12" />}
                      <circle className="marker-dot" r="8.5" />
                      <text y="3.2" textAnchor="middle">{stage.step}</text>
                    </g>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>
        <span className="map-source">Natural Earth world data · Stored locally</span>
      </div>
      <div className="track-map-header">
        <span><i /> DOCUMENTED ROUTE</span>
        <div className="world-controls">
          <button onClick={() => setZoom((value) => Math.min(5.2, value + 0.4))} aria-label="Zoom in"><Plus size={14} /></button>
          <button onClick={() => setZoom((value) => Math.max(1, value - 0.4))} aria-label="Zoom out"><Minus size={14} /></button>
          <button onClick={() => { setFocusMode("route"); setZoom(defaultZoom); setIsPlaying(false); }} aria-label="Focus on the complete product route"><Route size={14} /><b>Route</b></button>
          <button onClick={() => { setFocusMode("route"); setZoom(1); setIsPlaying(false); }} aria-label="Show complete world map"><Maximize2 size={14} /><b>World</b></button>
        </div>
      </div>
      <div className="track-progress" aria-hidden="true">
        <span style={{ width: `${(activeStage.step / lastStep) * 100}%` }} />
      </div>
      <div className="track-hud">
        <div className="hud-step">
          <small>STAGE {String(activeStage.step).padStart(2, "0")} / {String(lastStep).padStart(2, "0")}</small>
          <strong>{activeStage.title}</strong>
          <span>{isPlaying && currentStop ? currentStop.point.label : activeStage.location}</span>
        </div>
        <button className="play-route" onClick={playJourney}>
          {isPlaying ? <Pause size={16} /> : syncedTourIndex >= markers.length - 1 ? <RotateCcw size={16} /> : <Play size={16} fill="currentColor" />}
          <span>{isPlaying ? "Pause" : syncedTourIndex >= markers.length - 1 ? "Replay" : "Play journey"}</span>
        </button>
      </div>
    </section>
  );
}
