import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import { numericToIso } from '../utils/isoMap'
import { mapColorScale } from '../utils/colors'
import { SkeletonChart } from './Skeleton'

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

    // Background sphere
    svg.append('path')
      .datum({ type: 'Sphere' })
      .attr('d', path)
      .attr('fill', '#0a0c14')
      .attr('stroke', '#252a3a')

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
            return val != null ? mapColorScale(val) : '#181c28'
          })
          .attr('cursor', d => (numericToIso(+d.id) ? 'pointer' : 'default'))
          .attr('stroke', d => {
            const iso = numericToIso(+d.id)
            return iso && iso === selectedCountry ? '#22d3ee' : '#252a3a'
          })
          .attr('stroke-width', d => {
            const iso = numericToIso(+d.id)
            return iso && iso === selectedCountry ? 1.8 : 0.5
          })
          .style('transition', 'stroke 0.2s ease, stroke-width 0.2s ease')
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

  if (!data) {
    return <SkeletonChart height={300} />
  }

  return (
    <div className="card fade-in-up" style={{ padding: 12 }}>
      <h3 style={{
        fontSize: '0.82rem',
        color: 'var(--text-secondary)',
        marginBottom: 8,
        fontWeight: 600,
      }}>
        Global Cases <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(per 100k, last 4 weeks)</span>
      </h3>
      <svg ref={svgRef} style={{ width: '100%', height: 'auto' }} role="img" aria-label="World choropleth map of flu cases per 100k people" />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>
        <span className="mono">0</span>
        <div style={{
          flex: 1,
          height: 6,
          margin: '0 8px',
          background: 'linear-gradient(to right, #ffffcc, #fd8d3c, #e31a1c, #800026)',
          borderRadius: 3,
        }} />
        <span className="mono">40+</span>
      </div>
    </div>
  )
}
