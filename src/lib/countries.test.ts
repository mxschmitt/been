import { describe, expect, it } from 'vitest';
import { flattenCountries, parseCountries } from './countries';

const sample = `# Europe
- [x] DE Germany: inline desc
- [ ] FR France: |
    block desc line
    second line

# Asia
- [x] JP Japan
- [ ] CN China
`;

describe('parseCountries', () => {
  it('parses visited flag, ids, and names', () => {
    const regions = parseCountries(sample);
    const europe = regions.find(r => r.name === 'Europe');
    expect(europe?.countries).toHaveLength(2);
    const germany = europe?.countries.find(c => c.id === 'DE');
    expect(germany).toMatchObject({ id: 'DE', name: 'Germany', visited: true });
  });

  it('parses inline and block descriptions', () => {
    const regions = parseCountries(sample);
    const germany = flattenCountries(regions).find(c => c.id === 'DE');
    const france = flattenCountries(regions).find(c => c.id === 'FR');
    expect(germany?.description).toBe('inline desc');
    expect(france?.description).toBe('block desc line\nsecond line');
  });

  it('keeps regions sorted by country name', () => {
    const regions = parseCountries(sample);
    const asia = regions.find(r => r.name === 'Asia');
    const ids = asia?.countries.map(c => c.id);
    expect(ids).toEqual(['CN', 'JP']);
  });
});
