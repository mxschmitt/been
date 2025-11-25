import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

export type Country = { id: string; name: string; visited: boolean; description?: string };
export type Region = { name: string; countries: Country[] };

export type CountryDataState = {
  regions: Region[];
  loading: boolean;
  error: string | null;
};

export const parseCountries = (markdown: string): Region[] => {
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

export const flattenCountries = (regions: Region[]) => regions.flatMap(region => region.countries);

export type CountryFeatureCollection = FeatureCollection<Polygon | MultiPolygon, { id: string; name: string }>;
