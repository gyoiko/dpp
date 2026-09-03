"use client";

import { Maximize2, Pause, Play, RotateCcw, Route } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import { JourneyStage, mockProduct } from "@/data/mockProduct";

type TrackMapProps = {
  activeId: string | null;
  onSelect: (stage: JourneyStage) => void;
};

export default function TrackMap({ activeId, onSelect }: TrackMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, MapLibreMarker>>(new Map());
  const travelerRef = useRef<MapLibreMarker | null>(null);
  const onSelectRef = useRef(onSelect);
  const [isReady, setIsReady] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const activeIndex = Math.max(0, mockProduct.journey.findIndex((stage) => stage.id === activeId));
  const activeStage = mockProduct.journey[activeIndex];

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    const fallbackTimer = window.setTimeout(() => setIsFallback(true), 3500);

    void import("maplibre-gl").then((maplibregl) => {
      if (cancelled || !containerRef.current) return;
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: "https://tiles.openfreemap.org/styles/positron",
        center: [88, 8],
        zoom: 2.05,
        minZoom: 1.35,
        maxZoom: 11,
        attributionControl: { compact: true },
        projection: { type: "globe" },
      });
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;

      map.on("load", () => {
        const coordinates = mockProduct.journey.map((stage) => stage.coordinates);
        map.addSource("journey-route", { type: "geojson", lineMetrics: true, data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates } } });
        map.addLayer({ id: "journey-route-shadow", type: "line", source: "journey-route", paint: { "line-color": "#173127", "line-width": 7, "line-opacity": .16, "line-blur": 5 } });
        map.addLayer({ id: "journey-route", type: "line", source: "journey-route", paint: { "line-color": "#285d49", "line-width": 2.5, "line-opacity": .7, "line-dasharray": [2, 2] } });
        map.addSource("completed-route", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coordinates.slice(0, activeIndex + 1) } } });
        map.addLayer({ id: "completed-route-glow", type: "line", source: "completed-route", paint: { "line-color": "#d8f169", "line-width": 10, "line-opacity": .28, "line-blur": 6 } });
        map.addLayer({ id: "completed-route", type: "line", source: "completed-route", paint: { "line-color": "#bfe23d", "line-width": 4 } });

        mockProduct.journey.forEach((stage, index) => {
          const markerElement = document.createElement("button");
          markerElement.type = "button";
          markerElement.className = "track-marker";
          markerElement.dataset.stage = stage.id;
          markerElement.setAttribute("aria-label", `Track stage ${index + 1}: ${stage.title}`);
          markerElement.textContent = String(index + 1);
          markerElement.addEventListener("click", () => { setIsPlaying(false); setTourIndex(index); onSelectRef.current(stage); });
          const marker = new maplibregl.Marker({ element: markerElement, anchor: "center" }).setLngLat(stage.coordinates).addTo(map);
          markersRef.current.set(stage.id, marker);
        });

        const traveler = document.createElement("div");
        traveler.className = "journey-traveler";
        traveler.setAttribute("aria-hidden", "true");
        travelerRef.current = new maplibregl.Marker({ element: traveler, anchor: "center" }).setLngLat(activeStage.coordinates).addTo(map);
        window.clearTimeout(fallbackTimer);
        setIsReady(true);
      });
    }).catch(() => setIsFallback(true));

    return () => { cancelled = true; window.clearTimeout(fallbackTimer); markersRef.current.clear(); travelerRef.current = null; mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady || !activeStage) return;
    markersRef.current.forEach((marker, id) => marker.getElement().classList.toggle("active", id === activeStage.id));
    travelerRef.current?.setLngLat(activeStage.coordinates);
    const source = map.getSource("completed-route") as import("maplibre-gl").GeoJSONSource | undefined;
    const completedCoordinates = mockProduct.journey.slice(0, activeIndex + 1).map((stage) => stage.coordinates);
    if (completedCoordinates.length === 1) completedCoordinates.push(completedCoordinates[0]);
    source?.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: completedCoordinates } });
    map.flyTo({ center: activeStage.coordinates, zoom: activeIndex < 2 ? 5.2 : 7.4, duration: 1500, essential: true });
  }, [activeId, activeIndex, activeStage, isReady]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setTourIndex((current) => {
        if (current >= mockProduct.journey.length - 1) { setIsPlaying(false); return current; }
        const next = current + 1;
        onSelectRef.current(mockProduct.journey[next]);
        return next;
      });
    }, 2600);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const playJourney = () => {
    if (isPlaying) { setIsPlaying(false); return; }
    const start = activeIndex >= mockProduct.journey.length - 1 ? 0 : activeIndex;
    setTourIndex(start);
    onSelectRef.current(mockProduct.journey[start]);
    setIsPlaying(true);
  };

  const showOverview = () => {
    const map = mapRef.current;
    if (!map) return;
    setIsPlaying(false);
    map.fitBounds([[66, -12], [114, 27]], { padding: 42, duration: 1400, maxZoom: 3.4 });
  };

  return <section className="track-map-shell" aria-label="Interactive world map of the product journey">
    <div className={`instant-map ${isReady ? "hidden" : ""}`}>
      <div className="land land-one" /><div className="land land-two" /><div className="land land-three" /><div className="map-grid" />
      <div className="route-line line-one" /><div className="route-line line-two" />
      {mockProduct.journey.map((stage, index) => <button key={stage.id} className={`instant-point ${activeId === stage.id ? "active" : ""}`} style={{ left: `${stage.position.x}%`, top: `${stage.position.y}%` }} onClick={() => onSelect(stage)} aria-label={`Open ${stage.title}`}><span>{index + 1}</span></button>)}
      <span className="map-mode"><Route size={12} /> {isFallback ? "Lite map · route stays interactive" : "Loading detailed map…"}</span>
    </div>
    <div ref={containerRef} className={`track-map ${isReady ? "ready" : ""}`} />
    <div className="track-map-header"><span><i /> LIVE PRODUCT ROUTE</span><button onClick={showOverview} aria-label="Show complete route"><Maximize2 size={15} /> Overview</button></div>
    <div className="track-progress" aria-hidden="true"><span style={{ width: `${((activeIndex + 1) / mockProduct.journey.length) * 100}%` }} /></div>
    <div className="track-hud">
      <div className="hud-step"><small>STAGE {String(activeIndex + 1).padStart(2, "0")} / {String(mockProduct.journey.length).padStart(2, "0")}</small><strong>{activeStage.title}</strong><span>{activeStage.location}</span></div>
      <button className="play-route" onClick={playJourney}>{isPlaying ? <Pause size={16} /> : activeIndex === mockProduct.journey.length - 1 ? <RotateCcw size={16} /> : <Play size={16} fill="currentColor" />}<span>{isPlaying ? "Pause" : activeIndex === mockProduct.journey.length - 1 ? "Replay" : "Play journey"}</span></button>
    </div>
  </section>;
}
