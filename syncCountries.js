const fs = require('fs')
const path = require('path')
const countryData = require('@amcharts/amcharts5-geodata/json/data/countries2.json')

// Read existing countries.md to get checked countries
const countriesPath = path.join(__dirname, 'countries.md')
const checkedCountries = new Set()

if (fs.existsSync(countriesPath)) {
  const content = fs.readFileSync(countriesPath, 'utf8')
  const lines = content.split('\n')

  for (const line of lines) {
    // Match lines like "- [x] PT Portugal" or "- [X] IS Iceland"
    const match = line.match(/^- \[[xX]\] ([A-Z-]+)/)
    if (match) {
      checkedCountries.add(match[1])
    }
  }
}

// Generate new content
const continents = new Set(Object.entries(countryData).map(([code, country]) => country.continent))
let output = ''

for (const continent of continents) {
  const countries = Object.entries(countryData).filter(([code, country]) => country.continent === continent)
  output += `# ${continent}\n\n`
  for (const [code, country] of countries) {
    const checked = checkedCountries.has(code) ? 'x' : ' '
    output += `- [${checked}] ${code} ${country.country}\n`
  }
  output += `\n`
}

// Write to countries.md
fs.writeFileSync(countriesPath, output, 'utf8')
console.log('Successfully updated countries.md')