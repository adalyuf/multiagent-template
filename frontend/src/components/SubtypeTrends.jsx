import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import { subtypeColors } from '../utils/colors'

export default function SubtypeTrends({ data }) {
  const svgRef = useRef()

  useEffect(() => {
    if (!data || data.length === 0) return

    const width = 500
    const height = 280
    const margin = { top: 20, right: 120, bottom: 40, left: 60 }

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const subtypes = [...new Set(data.map(d => d.subtype))]
    const dates = [...new Set(data.map(d => d.date))].sort()

    // Build matrix
    const matrix = dates.map(date => {
      const row = { date: new Date(date) }
      subtypes.forEach(s => { row[s] = 0 })
      data.filter(d => d.date === date).forEach(d => { row[d.subtype] = d.cases })
      return row
    })

    const stack = d3.stack().keys(subtypes)
    const stacked = stack(matrix)

    const x = d3.scaleTime()
      .domain(d3.extent(matrix, d => d.date))
      .range([margin.left, width - margin.right])

    const y = d3.scaleLinear()
      .domain([0, d3.max(stacked[stacked.length - 1] || [[0,0]], d => d[1]) || 1])
      .range([height - margin.bottom, margin.top])

    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(6))
      .attr('color', '#666')

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.2s')))
      .attr('color', '#666')

    const area = d3.area()
      .x((d, i) => x(matrix[i].date))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
      .curve(d3.curveMonotoneX)

    svg.selectAll('.layer')
      .data(stacked)
      .join('path')
      .attr('class', 'layer')
      .attr('d', area)
      .attr('fill', d => subtypeColors[d.key] || '#666')
      .attr('opacity', 0.8)

    // Legend
    subtypes.forEach((s, i) => {
      svg.append('rect')
        .attr('x', width - margin.right + 8)
        .attr('y', margin.top + i * 18)
        .attr('width', 12).attr('height', 12)
        .attr('fill', subtypeColors[s] || '#666')
      svg.append('text')
        .attr('x', width - margin.right + 24)
        .attr('y', margin.top + i * 18 + 10)
        .attr('fill', '#ccc')
        .attr('font-size', '0.6rem')
        .text(s)
    })
  }, [data])

  return (
    <div style={{ background: '#0d1117', borderRadius: 8, padding: 12, border: '1px solid #2a2a4a' }}>
      <h3 style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: 8 }}>Subtype Trends (1 year)</h3>
      <svg ref={svgRef} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Stacked area chart showing subtype trends over time" />
    </div>
  )
}
