import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import { seasonColors } from '../utils/colors'
import { parseSeason } from '../utils/seasons'
import { SkeletonChart } from './Skeleton'

export default function HistoricalChart({ data, country = '', forecast = null, forecastUnavailable = false }) {
  const svgRef = useRef()
  const gaussianBaseline = (forecast?.forecast || [])[0]
  const hasGaussianBaseline = Number.isFinite(gaussianBaseline?.gaussian_mean) && Number.isFinite(gaussianBaseline?.gaussian_stddev)

  useEffect(() => {
    if (!data || data.length === 0) return

    const width = 700
    const height = 300
    const margin = { top: 20, right: 120, bottom: 40, left: 60 }

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    // Clip path for forecast CI band
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

    // Forecast points
    const fcastPoints = forecast
      ? (forecast.forecast || []).map(d => ({
          weekOffset: parseSeason(d.date).weekOffset,
          forecast: d.forecast || 0,
          lower: d.lower || 0,
          upper: d.upper || 0,
        }))
      : []

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
      .style('color', '#4a4f62')
      .selectAll('text').style('font-family', 'var(--font-mono)').style('font-size', '0.6rem')

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.2s')))
      .style('color', '#4a4f62')
      .selectAll('text').style('font-family', 'var(--font-mono)').style('font-size', '0.6rem')

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
        .style('font-size', '0.6rem')
        .style('font-family', 'var(--font-mono)')
        .attr('opacity', isCurrent ? 1 : 0.6)
        .text(season)
    })

    // Forecast series
    if (fcastPoints.length > 0) {
      const validFcast = fcastPoints.filter(d => d.weekOffset >= xExtent[0] && d.weekOffset <= xExtent[1])
        .sort((a, b) => a.weekOffset - b.weekOffset)

      if (validFcast.length > 0) {
        const area = d3.area()
          .x(d => x(d.weekOffset))
          .y0(d => y(d.lower))
          .y1(d => y(d.upper))
          .curve(d3.curveMonotoneX)

        svg.append('path')
          .datum(validFcast)
          .attr('d', area)
          .attr('fill', 'rgba(245, 158, 11, 0.1)')
          .attr('clip-path', 'url(#chart-area-clip)')

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
          .style('font-size', '0.6rem')
          .style('font-family', 'var(--font-mono)')
          .text('Forecast')
      }
    }

    // CI clip indicator
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
        .style('font-size', '0.58rem')
        .style('font-family', 'var(--font-mono)')
        .attr('text-anchor', 'end')
        .text('\u2191 CI extends beyond chart')
    }
  }, [data, forecast])

  if (!data) {
    return <SkeletonChart height={260} />
  }

  return (
    <div className="card fade-in-up stagger-1" style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <h3 style={{
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          margin: 0,
          fontWeight: 600,
        }}>
          Historical Season Comparison
          <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
            {country ? ` (${country})` : ' (Global)'}
          </span>
        </h3>
        {forecastUnavailable && (
          <span style={{
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            fontFamily: 'var(--font-mono)',
          }}>
            forecast unavailable
          </span>
        )}
        {hasGaussianBaseline && (
          <span style={{
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}>
            Gaussian baseline mu {gaussianBaseline.gaussian_mean.toFixed(1)} sigma {gaussianBaseline.gaussian_stddev.toFixed(1)}
          </span>
        )}
      </div>
      <svg ref={svgRef} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Line chart comparing historical seasonal flu cases with forecast" />
    </div>
  )
}
