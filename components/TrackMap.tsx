"use client";

import { geoGraticule10, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import landTopology from "world-atlas/land-110m.json";
import { Maximize2, Minus, Pause, Play, Plus, RotateCcw, Route } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { JourneyStage, mockProduct } from "@/data/mockProduct";

type TrackMapProps = { activeId: string | null; onSelect: (stage: JourneyStage) => void };
const WIDTH = 640;
const HEIGHT = 300;
const projection = geoNaturalEarth1().fitExtent([[8, 8], [WIDTH - 8, HEIGHT - 8]], { type: "Sphere" });
const path = geoPath(projection);
const land = feature(landTopology as never, (landTopology as { objects: { land: never } }).objects.land);
const worldPath = path(land) ?? "";
const spherePath = path({ type: "Sphere" }) ?? "";
const gridPath = path(geoGraticule10()) ?? "";

export default function TrackMap({ activeId, onSelect }: TrackMapProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [zoom, setZoom] = useState(2.25);
  const [focusMode, setFocusMode] = useState<"route" | "stage">("route");
  const initialId = useRef(activeId);
  const activeIndex = Math.max(0, mockProduct.journey.findIndex((stage) => stage.id === activeId));
  const activeStage = mockProduct.journey[activeIndex];
  const activePoint = projection(activeStage.coordinates) ?? [WIDTH / 2, HEIGHT / 2];
  const routePoint = projection([89, 8]) ?? [WIDTH / 2, HEIGHT / 2];
  const focusPoint = focusMode === "route" ? routePoint : activePoint;

  const routePath = useMemo(() => path({ type: "LineString", coordinates: mockProduct.journey.map((stage) => stage.coordinates) }) ?? "", []);
  const completedPath = useMemo(() => {
    const points = mockProduct.journey.slice(0, activeIndex + 1).map((stage) => stage.coordinates);
    if (points.length === 1) points.push(points[0]);
    return path({ type: "LineString", coordinates: points }) ?? "";
  }, [activeIndex]);

  useEffect(() => {
    if (activeId !== initialId.current && isPlaying) { setFocusMode("stage"); setZoom(4); }
  }, [activeId, isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setTourIndex((current) => {
        if (current >= mockProduct.journey.length - 1) { setIsPlaying(false); setFocusMode("route"); setZoom(2.25); return current; }
        const next = current + 1;
        onSelect(mockProduct.journey[next]);
        return next;
      });
    }, 2400);
    return () => window.clearInterval(timer);
  }, [isPlaying, onSelect]);

  const playJourney = () => {
    if (isPlaying) { setIsPlaying(false); return; }
    const canResume = tourIndex > 0 && tourIndex < mockProduct.journey.length - 1 && activeId === mockProduct.journey[tourIndex].id;
    const start = canResume ? tourIndex : 0;
    setTourIndex(start);
    onSelect(mockProduct.journey[start]);
    setFocusMode("stage");
    setZoom(4);
    setIsPlaying(true);
  };

  const selectMarker = (stage: JourneyStage, index: number) => {
    setIsPlaying(false);
    setTourIndex(index);
    setFocusMode("stage");
    setZoom(4);
    onSelect(stage);
  };

  const transform = zoom === 1 ? "translate(0px, 0px) scale(1)" : `translate(${WIDTH / 2}px, ${HEIGHT / 2}px) scale(${zoom}) translate(${-focusPoint[0]}px, ${-focusPoint[1]}px)`;

  return <section className="track-map-shell" aria-label="Interactive world map of the product journey">
    <div className="world-map">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="World map showing a cotton supply chain route from India to Indonesia">
        <g className="world-viewport" style={{ transform }}>
          <path className="world-ocean" d={spherePath} />
          <path className="world-grid" d={gridPath} />
          <path className="world-land" d={worldPath} />
          <path className="world-route-shadow" d={routePath} />
          <path className="world-route" d={routePath} />
          <path className="world-route-complete-glow" d={completedPath} />
          <path className="world-route-complete" d={completedPath} />
          {mockProduct.journey.map((stage, index) => {
            const point = projection(stage.coordinates) ?? [0, 0];
            const active = stage.id === activeId;
            return <g key={stage.id} className={`world-marker ${active ? "active" : ""}`} transform={`translate(${point[0]} ${point[1]})`} onClick={() => selectMarker(stage, index)} role="button" tabIndex={0} aria-label={`Stage ${index + 1}: ${stage.title}, ${stage.location}`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") selectMarker(stage, index); }}>
              <g className="marker-pin" transform={`scale(${1 / zoom})`}>
                {active && <circle className="marker-radar" r="12" />}
                <circle className="marker-dot" r="8.5" />
                <text y="3.2" textAnchor="middle">{index + 1}</text>
              </g>
            </g>;
          })}
        </g>
      </svg>
      <span className="map-source">Natural Earth world data · Stored locally</span>
    </div>
    <div className="track-map-header"><span><i /> VERIFIED ROUTE VIEW</span><div className="world-controls"><button onClick={() => setZoom((value) => Math.min(5.2, value + .4))} aria-label="Zoom in"><Plus size={14} /></button><button onClick={() => setZoom((value) => Math.max(1, value - .4))} aria-label="Zoom out"><Minus size={14} /></button><button onClick={() => { setFocusMode("route"); setZoom(2.25); setIsPlaying(false); }} aria-label="Focus on the complete product route"><Route size={14} /><b>Route</b></button><button onClick={() => { setFocusMode("route"); setZoom(1); setIsPlaying(false); }} aria-label="Show complete world map"><Maximize2 size={14} /><b>World</b></button></div></div>
    <div className="track-progress" aria-hidden="true"><span style={{ width: `${((activeIndex + 1) / mockProduct.journey.length) * 100}%` }} /></div>
    <div className="track-hud"><div className="hud-step"><small>STAGE {String(activeIndex + 1).padStart(2, "0")} / {String(mockProduct.journey.length).padStart(2, "0")}</small><strong>{activeStage.title}</strong><span>{activeStage.location}</span></div><button className="play-route" onClick={playJourney}>{isPlaying ? <Pause size={16} /> : activeIndex === mockProduct.journey.length - 1 ? <RotateCcw size={16} /> : <Play size={16} fill="currentColor" />}<span>{isPlaying ? "Pause" : activeIndex === mockProduct.journey.length - 1 ? "Replay" : "Play journey"}</span></button></div>
  </section>;
}
