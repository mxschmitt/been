import React, { useEffect, useMemo, useRef } from 'react';
import bbox from '@turf/bbox';
import MapGL, { Layer, MapRef, Source } from 'react-map-gl/mapbox';
import mapboxgl from 'mapbox-gl';
import type { LayerSpecification, MapMouseEvent, StyleSpecification } from 'mapbox-gl';
import type { CountryFeatureCollection } from '../lib/countries';
import { defaultView, fitPadding } from '../lib/mapConfig';

interface MapPanelProps {
  countryFeatures: CountryFeatureCollection;
  visitedSet: Set<string>;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onResetView: () => void;
  mapStyleUrl: string | StyleSpecification;
  mapboxToken: string | undefined;
}

export const MapPanel = ({
  countryFeatures,
  visitedSet,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  onResetView,
  mapStyleUrl,
  mapboxToken,
}: MapPanelProps) => {
  const mapRef = useRef<MapRef | null>(null);
  const hidePlaceLabels = (map: mapboxgl.Map | null) => {
    const style = map?.getStyle?.();
    if (!style?.layers)
      return;
    style.layers.forEach(layer => {
      if (layer.type === 'symbol' && layer.id.includes('settlement-'))
        map.setLayoutProperty(layer.id, 'visibility', 'none');
    });
  };

  useEffect(() => {
    if (!selectedId) {
      mapRef.current?.flyTo({ center: defaultView.center, zoom: defaultView.zoom, duration: 600 });
      return;
    }
    const feature = countryFeatures.features.find(f => f.properties?.id === selectedId);
    if (!feature)
      return;
    const [minX, minY, maxX, maxY] = bbox(feature);
    mapRef.current?.fitBounds(
      [
        [minX, minY],
        [maxX, maxY],
      ],
      { padding: fitPadding, duration: 800 }
    );
  }, [selectedId, countryFeatures]);

  const visitedList = useMemo(() => Array.from(visitedSet), [visitedSet]);

  const baseLayer: LayerSpecification = {
    id: 'countries-base',
    type: 'fill',
    source: 'countries',
    paint: {
      'fill-color': [
        'case',
        ['==', ['get', 'id'], selectedId],
        '#5db7ff',
        ['==', ['get', 'id'], hoveredId],
        '#e6f0ff',
        ['in', ['get', 'id'], ['literal', visitedList]],
        '#7bd88f',
        '#6f7690',
      ],
      'fill-opacity': 0.85,
    },
  };

  const borderLayer: LayerSpecification = {
    id: 'countries-borders',
    type: 'line',
    source: 'countries',
    paint: {
      'line-color': '#0a0f24',
      'line-width': 1,
    },
  };

  const hoveredStroke: LayerSpecification = {
    id: 'countries-hovered',
    type: 'line',
    source: 'countries',
    filter: ['==', ['get', 'id'], hoveredId],
    paint: {
      'line-color': '#2563eb',
      'line-width': 2,
    },
  };

  const selectedStroke: LayerSpecification = {
    id: 'countries-selected',
    type: 'line',
    source: 'countries',
    filter: ['==', ['get', 'id'], selectedId],
    paint: {
      'line-color': '#2563eb',
      'line-width': 3,
    },
  };

  const handleMapClick = (event: MapMouseEvent) => {
    const feature = event.features?.find(f => f.properties?.id)
    const id = feature?.properties?.id;
    onSelect(id ?? null);
  };

  const handleMapHover = (event: MapMouseEvent) => {
    const feature = event.features?.find(f => f.properties?.id)
    const id = feature?.properties?.id;
    onHover(id ?? null);
  };

  return (
    <section className="panel panel--map" aria-label="World map">
      <div className="map__toolbar">
        <span className="toolbar__label">Map</span>
        <div className="toolbar__actions" role="group" aria-label="Map controls">
          <button className="icon-button" onClick={() => mapRef.current?.zoomOut()} type="button" title="Zoom out">
            −
          </button>
          <button className="icon-button" onClick={() => mapRef.current?.zoomIn()} type="button" title="Zoom in">
            +
          </button>
        </div>
      </div>
      <div className="map__canvas">
        <MapGL
          attributionControl={false}
          ref={mapRef}
          mapLib={mapboxgl}
          reuseMaps
          initialViewState={{ longitude: defaultView.center[0], latitude: defaultView.center[1], zoom: defaultView.zoom }}
          mapStyle={mapStyleUrl}
          mapboxAccessToken={mapboxToken}
          renderWorldCopies={false}
          interactiveLayerIds={['countries-base']}
          onClick={handleMapClick}
          onMouseMove={handleMapHover}
          onMouseLeave={() => onHover(null)}
          onLoad={event => hidePlaceLabels(event.target)}
        >
          <Source id="countries" type="geojson" data={countryFeatures}>
            <Layer {...baseLayer} />
            <Layer {...borderLayer} />
            <Layer {...hoveredStroke} />
            <Layer {...selectedStroke} />
          </Source>
        </MapGL>
      </div>
    </section>
  );
};
