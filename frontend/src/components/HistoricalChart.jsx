import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import { seasonColors } from '../utils/colors'
import { parseSeason } from '../utils/seasons'

export default function HistoricalChart({ data, country = '', forecast = null, forecastUnavailable = false }) {
  const svgRef = useRef()

  useEffect(() => {
    if (!data || data.length === 0) return

    const width = 700
    const height = 300
    const margin = { top: 20, right: 120, bottom: 40, left: 60 }

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    // Clip path for forecast CI band — prevents wide CI from drawing outside chart area
    svg.append('defs').append('clipPath')
      .attr('id', 'chart-area-clip')
      .append('rect')
      .attr('x', margin.left)
      .attr('y', margin.top)
      .attr('width', width - margin.left - margin.right)
      .attr('height', height - margin.top - margin.bottom)

    // Group by season
    const bySeason = d3.group(data, d => d.season)
    const seasons = [...bySeason.keys()].sort().slice(-10)

    const xExtent = [0, 52]

    // Compute forecast points in week-offset space for yMax calculation
    const fcastPoints = forecast
      ? (forecast.forecast || []).map(d => ({
          weekOffset: parseSeason(d.date).weekOffset,
          forecast: d.forecast || 0,
          lower: d.lower || 0,
          upper: d.upper || 0,
        }))
      : []

    // Y-axis is driven by observed data + forecast mean, not CI upper bounds.
    // CI band is clipped to the chart area so it remains visible without
    // compressing the historical season lines when CI is wide.
    const yMax = Math.max(
      d3.max(data, d => d.cases) || 1,
      d3.max(fcastPoints, d => d.forecast) || 0,
    )
    const ciUpperMax = d3.max(fcastPoints, d => d.upper) || 0
    const ciIsClipped = fcastPoints.length > 0 && ciUpperMax > yMax

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

    // Forecast series: confidence band + dashed line
    if (fcastPoints.length > 0) {
      const validFcast = fcastPoints.filter(d => d.weekOffset >= xExtent[0] && d.weekOffset <= xExtent[1])
        .sort((a, b) => a.weekOffset - b.weekOffset)

      if (validFcast.length > 0) {
        // Confidence interval band
        const area = d3.area()
          .x(d => x(d.weekOffset))
          .y0(d => y(d.lower))
          .y1(d => y(d.upper))
          .curve(d3.curveMonotoneX)

        svg.append('path')
          .datum(validFcast)
          .attr('d', area)
          .attr('fill', 'rgba(245, 158, 11, 0.12)')
          .attr('clip-path', 'url(#chart-area-clip)')

        // Forecast dashed line
        const fline = d3.line()
          .x(d => x(d.weekOffset))
          .y(d => y(d.forecast))
          .curve(d3.curveMonotoneX)

        svg.append('path')
          .datum(validFcast)
          .attr('d', fline)
          .attr('fill', 'none')
          .attr('stroke', '#f59e0b')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '6,3')

        // Forecast legend entry
        const legendY = margin.top + seasons.length * 16
        svg.append('line')
          .attr('x1', width - margin.right + 8)
          .attr('x2', width - margin.right + 22)
          .attr('y1', legendY + 4)
          .attr('y2', legendY + 4)
          .attr('stroke', '#f59e0b')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '4,2')

        svg.append('text')
          .attr('x', width - margin.right + 26)
          .attr('y', legendY + 8)
          .attr('fill', '#f59e0b')
          .attr('font-size', '0.65rem')
          .text('Forecast')
      }
    }

    // Visual indicator when CI band is clipped at the top of the chart area
    if (ciIsClipped) {
      svg.append('line')
        .attr('class', 'ci-clip-indicator')
        .attr('x1', margin.left)
        .attr('x2', width - margin.right)
        .attr('y1', margin.top)
        .attr('y2', margin.top)
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,4')
        .attr('opacity', 0.9)

      svg.append('text')
        .attr('class', 'ci-clip-indicator')
        .attr('x', width - margin.right - 4)
        .attr('y', margin.top + 10)
        .attr('fill', '#f59e0b')
        .attr('font-size', '0.6rem')
        .attr('text-anchor', 'end')
        .text('\u2191 CI extends beyond chart')
    }
  }, [data, forecast])

  return (
    <div style={{ background: '#0d1117', borderRadius: 8, padding: 12, border: '1px solid #2a2a4a' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <h3 style={{ fontSize: '0.9rem', color: '#ccc', margin: 0 }}>
          Historical Season Comparison{country ? ` (${country})` : ' (Global)'}
        </h3>
        {forecastUnavailable && (
          <span style={{ fontSize: '0.7rem', color: '#888', fontStyle: 'italic' }}>
            forecast unavailable
          </span>
        )}
      </div>
      <svg ref={svgRef} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Line chart comparing historical seasonal flu cases with forecast" />
    </div>
  )
}
