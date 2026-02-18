import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import { seasonColors } from '../utils/colors'

export default function HistoricalChart({ data, country = '' }) {
  const svgRef = useRef()

  useEffect(() => {
    if (!data || data.length === 0) return

    const width = 700
    const height = 300
    const margin = { top: 20, right: 120, bottom: 40, left: 60 }

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    // Group by season
    const bySeason = d3.group(data, d => d.season)
    const seasons = [...bySeason.keys()].sort().slice(-10)

    const xExtent = [0, 52]
    const yMax = d3.max(data, d => d.cases) || 1

    const x = d3.scaleLinear().domain(xExtent).range([margin.left, width - margin.right])
    const y = d3.scaleLinear().domain([0, yMax]).range([height - margin.bottom, margin.top])

    // Axes
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(12).tickFormat(d => `W${d}`))
      .attr('color', '#666')

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.2s')))
      .attr('color', '#666')

    const line = d3.line()
      .x(d => x(d.week_offset))
      .y(d => y(d.cases))
      .curve(d3.curveMonotoneX)

    seasons.forEach((season, i) => {
      const points = (bySeason.get(season) || [])
        .filter(d => d.week_offset >= 0 && d.week_offset <= 52)
        .sort((a, b) => a.week_offset - b.week_offset)

      if (points.length === 0) return

      const isCurrent = i === seasons.length - 1
      svg.append('path')
        .datum(points)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', seasonColors(season))
        .attr('stroke-width', isCurrent ? 2.5 : 1)
        .attr('opacity', isCurrent ? 1 : 0.4)

      // Legend
      svg.append('text')
        .attr('x', width - margin.right + 8)
        .attr('y', margin.top + i * 16)
        .attr('fill', seasonColors(season))
        .attr('font-size', '0.65rem')
        .attr('opacity', isCurrent ? 1 : 0.6)
        .text(season)
    })
  }, [data])

  return (
    <div style={{ background: '#0d1117', borderRadius: 8, padding: 12, border: '1px solid #2a2a4a' }}>
      <h3 style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: 8 }}>
        Historical Season Comparison{country ? ` (${country})` : ' (Global)'}
      </h3>
      <svg ref={svgRef} style={{ width: '100%', height: 'auto' }} />
    </div>
  )
}
