import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { SkeletonChart } from './Skeleton'

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
  ariaLabel = '',
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
      .style('color', '#4a4f62')
      .selectAll('text').style('font-family', 'var(--font-mono)').style('font-size', '0.55rem')

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.2s')))
      .style('color', '#4a4f62')
      .selectAll('text').style('font-family', 'var(--font-mono)').style('font-size', '0.55rem')

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
        .attr('width', 10)
        .attr('height', 10)
        .attr('rx', 2)
        .attr('fill', resolveColor(colorScale, key))
      svg.append('text')
        .attr('x', width - margin.right + 22)
        .attr('y', margin.top + i * 18 + 9)
        .attr('fill', '#8b90a5')
        .style('font-size', '0.55rem')
        .style('font-family', 'var(--font-display)')
        .text(key)
    })
  }, [colorScale, data, keys, seriesAccessor, xAccessor, yAccessor])

  if (!data || data.length === 0) {
    return <SkeletonChart height={240} />
  }

  return (
    <div className="card fade-in-up" style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          fontWeight: 600,
        }}>
          {title}
        </h3>
        {headerAction}
      </div>
      <svg
        ref={svgRef}
        style={{ width: '100%', height: 'auto' }}
        role="img"
        aria-label={ariaLabel || title}
      />
    </div>
  )
}
