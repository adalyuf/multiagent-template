import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'

export default function ForecastChart({ data }) {
  const svgRef = useRef()

  useEffect(() => {
    if (!data) return
    const historical = data.historical || []
    const forecast = data.forecast || []
    if (historical.length === 0 && forecast.length === 0) return

    const all = [...historical, ...forecast]
    const width = 700
    const height = 280
    const margin = { top: 20, right: 40, bottom: 40, left: 60 }

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const x = d3.scaleTime()
      .domain(d3.extent(all, d => new Date(d.date)))
      .range([margin.left, width - margin.right])

    const yMax = d3.max(all, d => Math.max(d.actual || 0, d.upper || 0, d.forecast || 0))
    const y = d3.scaleLinear()
      .domain([0, yMax || 1])
      .range([height - margin.bottom, margin.top])

    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(8))
      .attr('color', '#666')

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.2s')))
      .attr('color', '#666')

    // Confidence interval area
    if (forecast.length > 0) {
      const area = d3.area()
        .x(d => x(new Date(d.date)))
        .y0(d => y(d.lower || 0))
        .y1(d => y(d.upper || 0))

      svg.append('path')
        .datum(forecast)
        .attr('d', area)
        .attr('fill', 'rgba(245, 158, 11, 0.15)')

      // Forecast line
      const fline = d3.line()
        .x(d => x(new Date(d.date)))
        .y(d => y(d.forecast || 0))

      svg.append('path')
        .datum(forecast)
        .attr('d', fline)
        .attr('fill', 'none')
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6,3')
    }

    // Historical line
    if (historical.length > 0) {
      const hline = d3.line()
        .x(d => x(new Date(d.date)))
        .y(d => y(d.actual || 0))
        .curve(d3.curveMonotoneX)

      svg.append('path')
        .datum(historical)
        .attr('d', hline)
        .attr('fill', 'none')
        .attr('stroke', '#60a5fa')
        .attr('stroke-width', 2)
    }
  }, [data])

  return (
    <div style={{ background: '#0d1117', borderRadius: 8, padding: 12, border: '1px solid #2a2a4a' }}>
      <h3 style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: 8 }}>Forecast (8 weeks)</h3>
      <svg ref={svgRef} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Forecast chart with confidence interval bands" />
    </div>
  )
}
