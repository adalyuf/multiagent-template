import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import { numericToIso } from '../utils/isoMap'
import { mapColorScale } from '../utils/colors'

const WORLD_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
let worldMapPromise = null

async function getWorldMap(url) {
  if (!worldMapPromise) {
    worldMapPromise = d3.json(url).catch((err) => {
      worldMapPromise = null
      throw err
    })
  }
  return worldMapPromise
}

export default function ChoroplethMap({ data, selectedCountry = '', onSelectCountry = () => {} }) {
  const svgRef = useRef()

  useEffect(() => {
    if (!data) return

    const dataMap = {}
    data.forEach(d => { dataMap[d.country_code] = d.per_100k })

    const width = 800
    const height = 400
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const projection = d3.geoNaturalEarth1().fitSize([width, height], { type: 'Sphere' })
    const path = d3.geoPath(projection)

    // Background
    svg.append('path')
      .datum({ type: 'Sphere' })
      .attr('d', path)
      .attr('fill', '#0d1117')
      .attr('stroke', '#333')

    getWorldMap(WORLD_URL)
      .then(world => {
        const countries = topojson.feature(world, world.objects.countries)
        svg.selectAll('path.country')
          .data(countries.features)
          .join('path')
          .attr('class', 'country')
          .attr('d', path)
          .attr('fill', d => {
            const iso = numericToIso(+d.id)
            const val = iso ? dataMap[iso] : null
            return val != null ? mapColorScale(val) : '#1a1a2e'
          })
          .attr('cursor', d => (numericToIso(+d.id) ? 'pointer' : 'default'))
          .attr('stroke', d => {
            const iso = numericToIso(+d.id)
            return iso && iso === selectedCountry ? '#f59e0b' : '#333'
          })
          .attr('stroke-width', d => {
            const iso = numericToIso(+d.id)
            return iso && iso === selectedCountry ? 1.8 : 0.5
          })
          .on('click', (_, d) => {
            const iso = numericToIso(+d.id)
            if (!iso) return
            onSelectCountry(iso === selectedCountry ? '' : iso)
          })
          .append('title')
          .text(d => {
            const iso = numericToIso(+d.id)
            const val = iso ? dataMap[iso] : null
            return `${iso || d.id}: ${val != null ? val.toFixed(1) + ' per 100k' : 'No data'}`
          })
      })
  }, [data, selectedCountry, onSelectCountry])

  return (
    <div style={{ background: '#0d1117', borderRadius: 8, padding: 12, border: '1px solid #2a2a4a' }}>
      <h3 style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: 8 }}>Global Cases (per 100k, last 4 weeks)</h3>
      <svg ref={svgRef} style={{ width: '100%', height: 'auto' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#888', marginTop: 4 }}>
        <span>0</span>
        <div style={{ flex: 1, height: 8, margin: '0 8px', background: 'linear-gradient(to right, #ffffcc, #fd8d3c, #e31a1c, #800026)', borderRadius: 4 }} />
        <span>40+</span>
      </div>
    </div>
  )
}
