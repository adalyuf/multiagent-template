import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

const CARD_STYLE = { background: '#0d1117', borderRadius: 8, padding: 12, border: '1px solid #2a2a4a' }

function resolveColor(colorScale, key) {
  if (typeof colorScale === 'function') return colorScale(key)
  return colorScale?.[key] || '#666'
}

export default function StackedAreaChart({
  data,
  keys,
  colorScale,
  xAccessor,
  yAccessor,
  seriesAccessor,
  title,
  headerAction = null,
}) {
  const svgRef = useRef()

  useEffect(() => {
    if (!data || data.length === 0 || !keys || keys.length === 0) return

    const width = 500
    const height = 280
    const margin = { top: 20, right: 120, bottom: 40, left: 60 }

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const dateStrings = [...new Set(data.map((d) => String(xAccessor(d))))].sort()
    const matrix = dateStrings.map((dateStr) => {
      const row = { date: new Date(dateStr) }
      keys.forEach((k) => {
        row[k] = 0
      })
      return row
    })
    const rowByDate = Object.fromEntries(dateStrings.map((d, i) => [d, matrix[i]]))

    data.forEach((point) => {
      const dateStr = String(xAccessor(point))
      const key = seriesAccessor(point)
      const row = rowByDate[dateStr]
      if (row && keys.includes(key)) {
        row[key] = yAccessor(point)
      }
    })

    const stacked = d3.stack().keys(keys)(matrix)

    const x = d3.scaleTime()
      .domain(d3.extent(matrix, (d) => d.date))
      .range([margin.left, width - margin.right])

    const y = d3.scaleLinear()
      .domain([0, d3.max(stacked[stacked.length - 1] || [[0, 0]], (d) => d[1]) || 1])
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
      .x((_, i) => x(matrix[i].date))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(d3.curveMonotoneX)

    svg.selectAll('.layer')
      .data(stacked)
      .join('path')
      .attr('class', 'layer')
      .attr('d', area)
      .attr('fill', (d) => resolveColor(colorScale, d.key))
      .attr('opacity', 0.8)

    keys.forEach((key, i) => {
      svg.append('rect')
        .attr('x', width - margin.right + 8)
        .attr('y', margin.top + i * 18)
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', resolveColor(colorScale, key))
      svg.append('text')
        .attr('x', width - margin.right + 24)
        .attr('y', margin.top + i * 18 + 10)
        .attr('fill', '#ccc')
        .attr('font-size', '0.6rem')
        .text(key)
    })
  }, [colorScale, data, keys, seriesAccessor, xAccessor, yAccessor])

  return (
    <div style={CARD_STYLE}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ fontSize: '0.9rem', color: '#ccc' }}>{title}</h3>
        {headerAction}
      </div>
      <svg ref={svgRef} style={{ width: '100%', height: 'auto' }} />
    </div>
  )
}
