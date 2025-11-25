import React, { useEffect, useMemo, useRef, useState } from 'react';
import MapGL, { Layer, MapRef, Source } from 'react-map-gl/mapbox';
import mapboxgl from 'mapbox-gl';
import bbox from '@turf/bbox';
import worldLow from '@amcharts/amcharts5-geodata/worldLow';
import type { Feature, FeatureCollection, GeoJsonProperties, MultiPolygon, Polygon } from 'geojson';
import type { LayerSpecification, MapLayerMouseEvent, StyleSpecification } from 'mapbox-gl';

type Country = { id: string; name: string; visited: boolean; description?: string };
type Region = { name: string; countries: Country[] };

type CountryDataState = {
  regions: Region[];
  loading: boolean;
  error: string | null;
};

const VITE_MAPBOX_TOKEN=  "pk.eyJ1IjoibXhzY2htaXR0IiwiYSI6ImNtaWV6emYwdTA4bnYzY3BoMWRzZ2lub2QifQ.6iw4F5vY3-BUZ3RG_KyNEA"

const parseCountries = (markdown: string): Region[] => {
  const regions: Region[] = [];
  let current: Region | null = null;
  const lines = markdown.split('\n');

  for (let index = 0; index < lines.length; index++) {
    const rawLine = lines[index];
    const line = rawLine.trim();
    if (!line.length)
      continue;
    if (line.startsWith('# ')) {
      current = { name: line.substring(2).trim(), countries: [] };
      regions.push(current);
      continue;
    }

    const match = rawLine.match(/^\-\s*\[([xX\s])\]\s+([A-Za-z-]{2,})\s+(.+?)(?::\s*(\|)?\s*(.*))?$/);
    if (match && current) {
      const visited = match[1].toLowerCase() === 'x';
      const id = match[2];
      const name = match[3].trim();
      const hasBlockDescription = !!match[4];
      const inlineDescription = match[5]?.trim();

      let description = inlineDescription?.length ? inlineDescription : undefined;

      if (hasBlockDescription) {
        const descLines: string[] = [];
        let pointer = index + 1;
        while (pointer < lines.length) {
          const nextLine = lines[pointer];
          if (/^\s{2,}/.test(nextLine)) {
            descLines.push(nextLine.replace(/^\s+/, ''));
            pointer++;
            continue;
          }
          if (!nextLine.trim().length) {
            descLines.push('');
            pointer++;
            continue;
          }
          break;
        }
        const block = descLines.join('\n').trim();
        description = block.length ? block : description;
        index = pointer - 1;
      }

      current.countries.push({
        id,
        name,
        visited,
        description,
      });
    }
  }

  return regions.map(region => ({
    ...region,
    countries: region.countries.sort((a, b) => a.name.localeCompare(b.name)),
  }));
};

const flattenCountries = (regions: Region[]) => regions.flatMap(region => region.countries);

const useCountryData = (): CountryDataState => {
  const [state, setState] = useState<CountryDataState>({
    regions: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const countriesUrl = new URL('countries.md', new URL(import.meta.env.BASE_URL || '/', window.location.href)).toString();
        const countriesResponse = await fetch(countriesUrl);
        if (!countriesResponse.ok)
          throw new Error('Failed to load countries.md');
        const countriesMarkdown = await countriesResponse.text();
        if (cancelled)
          return;
        const regions = parseCountries(countriesMarkdown);
        setState({ regions, loading: false, error: null });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        if (!cancelled)
          setState({ regions: [], loading: false, error: message });
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
};

const classNames = (...args: Array<string | null | undefined | false>) => args.filter(Boolean).join(' ');

const VisitedBadge = ({ visited }: { visited: boolean }) => (
  <span className={classNames('pill', visited ? 'pill--success' : 'pill--muted')}>
    {visited ? 'Visited' : 'Not yet'}
  </span>
);

const RegionSection = ({
  region,
  filteredCountries,
  selectedId,
  hoveredId,
  onSelect,
  registerRef,
}: {
  region: Region;
  filteredCountries: Country[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null, options?: { hoverOnly?: boolean }) => void;
  registerRef: (id: string) => (node: HTMLButtonElement | null) => void;
}) => {
  const visitedCount = region.countries.filter(c => c.visited).length;
  return (
    <div className="region">
      <div className="region__header">
        <div className="region__title">{region.name}</div>
        <div className="region__meta">
          {visitedCount}/{region.countries.length}
        </div>
      </div>
      <div className="region__list">
        {filteredCountries.map(country => (
          <button
            key={country.id}
            className={classNames(
              'country',
              country.visited && 'country--visited',
              country.id === selectedId && 'country--active',
              country.id === hoveredId && 'country--hovered'
            )}
            ref={registerRef(country.id)}
            onMouseEnter={() => onSelect(country.id, { hoverOnly: true })}
            onMouseLeave={() => onSelect(null, { hoverOnly: true })}
            onFocus={() => onSelect(country.id, { hoverOnly: true })}
            onBlur={() => onSelect(null, { hoverOnly: true })}
            onClick={() => onSelect(country.id)}
          >
            <div className="country__name">{country.name}</div>
            <div className="country__code">{country.id}</div>
            <VisitedBadge visited={country.visited} />
            {country.description ? <div className="country__note">{country.description}</div> : null}
          </button>
        ))}
      </div>
    </div>
  );
};

const CountryList = ({
  regions,
  selectedId,
  hoveredId,
  onSelect,
  search,
  visitedOnly,
  registerRef,
}: {
  regions: Region[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null, options?: { hoverOnly?: boolean }) => void;
  search: string;
  visitedOnly: boolean;
  registerRef: (id: string) => (node: HTMLButtonElement | null) => void;
}) => {
  const normalizedSearch = search.trim().toLowerCase();
  return (
    <aside className="panel panel--list" aria-label="Visited countries list">
      <div className="panel__content">
        {regions.map(region => {
          const filteredCountries = region.countries.filter(country => {
            if (visitedOnly && !country.visited)
              return false;
            if (!normalizedSearch.length)
              return true;
            return (
              country.name.toLowerCase().includes(normalizedSearch) ||
              country.id.toLowerCase().includes(normalizedSearch)
            );
          });
          if (!filteredCountries.length)
            return null;
          return (
            <RegionSection
              key={region.name}
              region={region}
              filteredCountries={filteredCountries}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={onSelect}
              registerRef={registerRef}
            />
          );
        })}
      </div>
    </aside>
  );
};

interface MapPanelProps {
  countryFeatures: FeatureCollection<Polygon | MultiPolygon, { id: string; name: string }>;
  visitedSet: Set<string>;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onResetView: () => void;
  mapStyleUrl: string | StyleSpecification;
}

const MapPanel = ({
  countryFeatures,
  visitedSet,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  onResetView,
  mapStyleUrl,
}: MapPanelProps) => {
  const mapRef = useRef<MapRef | null>(null);
  const defaultView = { center: [12, 50] as [number, number], zoom: 3.3 };

  useEffect(() => {
    if (!selectedId) {
      mapRef.current?.flyTo({ center: defaultView.center, zoom: defaultView.zoom, duration: 600 });
      return;
    }
    const feature = countryFeatures.features.find(f => f.properties?.id === selectedId);
    if (!feature)
      return;
    const [minX, minY, maxX, maxY] = bbox(feature as Feature<Polygon | MultiPolygon, GeoJsonProperties>);
    mapRef.current?.fitBounds(
      [
        [minX, minY],
        [maxX, maxY],
      ],
      { padding: 60, duration: 800 }
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

  const handleMapClick = (event: MapLayerMouseEvent) => {
    const feature = event.features?.find(f => f.properties?.id) as Feature | undefined;
    const id = (feature?.properties as GeoJsonProperties | undefined)?.id as string | undefined;
    onSelect(id ?? null);
  };

  const handleMapHover = (event: MapLayerMouseEvent) => {
    const feature = event.features?.find(f => f.properties?.id) as Feature | undefined;
    const id = (feature?.properties as GeoJsonProperties | undefined)?.id as string | undefined;
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
          <button
            className="icon-button"
            onClick={() => {
              mapRef.current?.flyTo({ center: defaultView.center, zoom: defaultView.zoom, duration: 600 });
              onResetView();
            }}
            type="button"
            title="Reset view"
          >
            ⟳
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
          mapboxAccessToken={VITE_MAPBOX_TOKEN}
          renderWorldCopies={false}
          interactiveLayerIds={['countries-base']}
          onClick={handleMapClick}
          onMouseMove={handleMapHover}
          onMouseLeave={() => onHover(null)}
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

const App = () => {
  const { regions, loading, error } = useCountryData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [visitedOnly, setVisitedOnly] = useState(false);
  const countryRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const mapStyleUrl = 'mapbox://styles/mapbox/light-v11';

  const allCountries = useMemo(() => flattenCountries(regions), [regions]);
  const visitedSet = useMemo(() => new Set(allCountries.filter(c => c.visited).map(c => c.id)), [allCountries]);
  const totalVisited = useMemo(() => allCountries.filter(c => c.visited).length, [allCountries]);

  const [countryFeatures, setCountryFeatures] = useState<FeatureCollection<Polygon | MultiPolygon, { id: string; name: string }>>({
    type: 'FeatureCollection',
    features: [],
  });

  useEffect(() => {
    const fc = (worldLow as any).default || (worldLow as any);
    const features = (fc.features || [])
      .map((f: any) => {
        if (!f.geometry)
          return null;
        const id = (f.properties?.id || '').toString().toUpperCase();
        const name = f.properties?.name || '';
        if (!id || !name)
          return null;
        return {
          type: 'Feature',
          geometry: f.geometry as Polygon | MultiPolygon,
          properties: { id, name },
        } as Feature<Polygon | MultiPolygon, { id: string; name: string }>;
      })
      .filter((f: Feature<Polygon | MultiPolygon, { id: string; name: string }> | null): f is Feature<Polygon | MultiPolygon, { id: string; name: string }> => !!f);
    setCountryFeatures({ type: 'FeatureCollection', features });
  }, []);

  const registerCountryRef = (id: string) => (node: HTMLButtonElement | null) => {
    if (node) {
      countryRefs.current[id] = node;
    } else {
      delete countryRefs.current[id];
    }
  };

  useEffect(() => {
    if (!selectedId)
      return;
    const target = countryRefs.current[selectedId];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      try {
        target.focus({ preventScroll: true });
      } catch {
        target.focus();
      }
    }
  }, [selectedId]);

  const handleSelect = (id: string | null, options: { hoverOnly?: boolean } = {}) => {
    if (options.hoverOnly) {
      setHoveredId(id);
      return;
    }
    setSelectedId(prev => (prev === id ? null : id));
  };

  const handleResetView = () => setSelectedId(null);

  if (loading) {
    return <div className="app app--loading">Loading map and countries…</div>;
  }

  if (error) {
    return <div className="app app--error">{`Something went wrong: ${error}`}</div>;
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="brand">
          <div className="brand__title">Where Has Max Been?</div>
          <div className="brand__subtitle">Max Schmitt's visited countries tracker</div>
        </div>
        <div className="stats">
          <div className="stats__value">
            {totalVisited}/{allCountries.length}
          </div>
          <div className="stats__label">Visited</div>
        </div>
      </header>

      <section className="filters" aria-label="Filters">
        <div className="field">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Find a country by name or code"
            autoComplete="off"
          />
        </div>
        <div className="field toggle-field">
          <label className="toggle" htmlFor="visited-toggle">
            <input
              id="visited-toggle"
              type="checkbox"
              checked={visitedOnly}
              onChange={event => setVisitedOnly(event.target.checked)}
            />
            <span className="toggle__track">
              <span className="toggle__thumb" />
            </span>
            <div className="toggle__copy">
              <span className="toggle__title">Visited only</span>
              <span className="toggle__hint">Hide countries not checked off</span>
            </div>
          </label>
        </div>
      </section>

      <main className="layout">
        <CountryList
          regions={regions}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={handleSelect}
          search={search}
          visitedOnly={visitedOnly}
          registerRef={registerCountryRef}
        />
        <MapPanel
          countryFeatures={countryFeatures}
          visitedSet={visitedSet}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={id => handleSelect(id)}
          onHover={id => setHoveredId(id)}
          onResetView={handleResetView}
          mapStyleUrl={mapStyleUrl}
        />
      </main>
      <footer className="app__footer">
        Source available on{' '}
        <a href="https://github.com/mxschmitt/been" target="_blank" rel="noreferrer">
          GitHub
        </a>.
      </footer>
    </div>
  );
};

export default App;
