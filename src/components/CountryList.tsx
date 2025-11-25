import React from 'react';
import clsx from 'clsx';
import type { Country, Region } from '../lib/countries';
import { VisitedBadge } from './VisitedBadge';

const flagFromCode = (code: string) => {
  if (!code || code.length !== 2)
    return '🌐';
  const upper = code.toUpperCase();
  const first = upper.codePointAt(0);
  const second = upper.codePointAt(1);
  if (!first || !second)
    return '🌐';
  const base = 0x1f1e6;
  const offset = 'A'.codePointAt(0) ?? 65;
  return String.fromCodePoint(base + (first - offset), base + (second - offset));
};

export const RegionSection = ({
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
            className={clsx(
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
            <div className="country__name">
              <span className="country__flag" aria-hidden="true">
                {flagFromCode(country.id)}
              </span>
              <span className="country__label">{country.name}</span>
            </div>
            <div className="country__code">{country.id}</div>
            <VisitedBadge visited={country.visited} />
            {country.description ? <div className="country__note">{country.description}</div> : null}
          </button>
        ))}
      </div>
    </div>
  );
};

export const CountryList = ({
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
