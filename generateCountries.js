const countryData = require('@amcharts/amcharts5-geodata/json/data/countries2.json')

const continents = new Set(Object.entries(countryData).map(([code, country]) => country.continent))

for (const continent of continents) {
  const countries = Object.entries(countryData).filter(([code, country]) => country.continent === continent)
  console.log(`# ${continent}\n`)
  for (const [code, country] of countries) {
    console.log(`- [ ] ${code} ${country.country}`)
  }
  console.log(``)
}