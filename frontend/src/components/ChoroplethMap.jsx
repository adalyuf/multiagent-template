import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import { numericToIso } from '../utils/isoMap'
import { mapColorScale } from '../utils/colors'
import { SkeletonChart } from './Skeleton'
import ChartTooltip from './ChartTooltip'
import { positionTooltip, showTooltip, hideTooltip } from '../utils/tooltipHelpers'

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
  const tooltipRef = useRef()

  useEffect(() => {
    if (!data) return

    // Hide tooltip at start of each effect run
    hideTooltip(tooltipRef.current)

    const dataMap = {}
    data.forEach(d => { dataMap[d.country_code] = d.per_100k })

    const width = 700
    const height = 320
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const projection = d3.geoNaturalEarth1().fitSize([width, height], { type: 'Sphere' })
    const path = d3.geoPath(projection)

    // Background sphere
    svg.append('path')
      .datum({ type: 'Sphere' })
      .attr('d', path)
      .attr('fill', '#080a14')
      .attr('stroke', '#1a1e30')

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
            return val != null ? mapColorScale(val) : '#151828'
          })
          .attr('cursor', d => (numericToIso(+d.id) ? 'pointer' : 'default'))
          .attr('stroke', d => {
            const iso = numericToIso(+d.id)
            return iso && iso === selectedCountry ? '#22d3ee' : '#1a1e30'
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
          .on('mouseover', function (event, d) {
            const iso = numericToIso(+d.id)
            if (!iso) return
            const val = dataMap[iso]
            const tooltipEl = tooltipRef.current
            if (!tooltipEl) return

            let html = `<div style="color:var(--text-secondary);margin-bottom:2px">${iso}</div>`
            html += `<div style="color:var(--text-primary)">${val != null ? val.toFixed(1) + ' per 100k' : 'No data'}</div>`
            tooltipEl.innerHTML = html

            showTooltip(tooltipEl)
            const [mx, my] = d3.pointer(event, svgRef.current)
            positionTooltip(tooltipEl, svgRef.current, mx, my)
          })
          .on('mousemove', function (event) {
            const tooltipEl = tooltipRef.current
            if (!tooltipEl) return
            const [mx, my] = d3.pointer(event, svgRef.current)
            positionTooltip(tooltipEl, svgRef.current, mx, my)
          })
          .on('mouseleave', function () {
            hideTooltip(tooltipRef.current)
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
    return <SkeletonChart height={220} />
  }

  return (
    <div className="card-analytics fade-in-up" style={{ padding: 10 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
      }}>
        <h3 style={{
          fontSize: '0.75rem',
          color: 'var(--text-primary)',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          Global Cases
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.65rem' }}>(per 100k, last 4 wk)</span>
        </h3>
      </div>
      <div style={{ position: 'relative' }}>
        <svg ref={svgRef} style={{ width: '100%', height: 'auto' }} role="img" aria-label="World choropleth map of flu cases per 100k people" />
        <ChartTooltip ref={tooltipRef} />
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.55rem',
        color: 'var(--text-dim)',
        marginTop: 4,
        padding: '0 2px',
      }}>
        <span className="mono">0</span>
        <div style={{
          flex: 1,
          height: 4,
          margin: '0 6px',
          background: 'linear-gradient(to right, #ffffcc, #fd8d3c, #e31a1c, #800026)',
          borderRadius: 2,
          opacity: 0.85,
        }} />
        <span className="mono">40+</span>
      </div>
    </div>
  )
}
