import { useEffect, useState } from 'react';
import { parseCountries, type CountryDataState } from '../lib/countries';

export const useCountryData = (): CountryDataState => {
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
