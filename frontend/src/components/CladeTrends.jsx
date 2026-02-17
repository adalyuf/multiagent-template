import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import { cladeColors } from '../utils/colors'
import { Link } from 'react-router-dom'

export default function CladeTrends({ data }) {
  const svgRef = useRef()

  useEffect(() => {
    if (!data || data.length === 0) return

    const width = 500
    const height = 280
    const margin = { top: 20, right: 120, bottom: 40, left: 60 }

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const clades = [...new Set(data.map(d => d.clade))]
    const dates = [...new Set(data.map(d => d.date))].sort()

    const matrix = dates.map(date => {
      const row = { date: new Date(date) }
      clades.forEach(c => { row[c] = 0 })
      data.filter(d => d.date === date).forEach(d => { row[d.clade] = d.count })
      return row
    })

    const stack = d3.stack().keys(clades)
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
      .attr('fill', d => cladeColors(d.key))
      .attr('opacity', 0.8)

    // Legend
    clades.forEach((c, i) => {
      svg.append('rect')
        .attr('x', width - margin.right + 8)
        .attr('y', margin.top + i * 18)
        .attr('width', 12).attr('height', 12)
        .attr('fill', cladeColors(c))
      svg.append('text')
        .attr('x', width - margin.right + 24)
        .attr('y', margin.top + i * 18 + 10)
        .attr('fill', '#ccc')
        .attr('font-size', '0.6rem')
        .text(c)
    })
  }, [data])

  return (
    <div style={{ background: '#0d1117', borderRadius: 8, padding: 12, border: '1px solid #2a2a4a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ fontSize: '0.9rem', color: '#ccc' }}>Clade Trends (1 year)</h3>
        <Link to="/genomics" style={{ fontSize: '0.75rem', color: '#f59e0b', textDecoration: 'none' }}>
          View Genomics Dashboard →
        </Link>
      </div>
      <svg ref={svgRef} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Stacked area chart showing clade trends over time" />
    </div>
  )
}
