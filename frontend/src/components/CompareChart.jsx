import React, { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'
import { api } from '../api'

export default function CompareChart() {
  const svgRef = useRef()
  const [data, setData] = useState(null)

  useEffect(() => {
    api.historical().then(setData).catch(() => {})
  }, [])

  useEffect(() => {
    if (!data || data.length === 0) return

    const width = 700
    const height = 300
    const margin = { top: 20, right: 100, bottom: 40, left: 60 }

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
    if (sorted.length === 0) return

    const x = d3.scaleTime()
      .domain(d3.extent(sorted, d => new Date(d.date)))
      .range([margin.left, width - margin.right])

    const y = d3.scaleLinear()
      .domain([0, d3.max(sorted, d => d.cases) || 1])
      .range([height - margin.bottom, margin.top])

    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(8))
      .attr('color', '#666')

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.2s')))
      .attr('color', '#666')

    const line = d3.line()
      .x(d => x(new Date(d.date)))
      .y(d => y(d.cases))
      .curve(d3.curveMonotoneX)

    svg.append('path')
      .datum(sorted)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 2)
  }, [data])

  return (
    <div style={{ background: '#0d1117', borderRadius: 8, padding: 12, border: '1px solid #2a2a4a' }}>
      <h3 style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: 8 }}>Global Case Trend</h3>
      <svg ref={svgRef} style={{ width: '100%', height: 'auto' }} />
    </div>
  )
}
