import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import { seasonColors } from '../utils/colors'
import { parseSeason } from '../utils/seasons'
import { SkeletonChart } from './Skeleton'
import ChartTooltip from './ChartTooltip'
import { positionTooltip, showTooltip, hideTooltip, formatValue } from '../utils/tooltipHelpers'

export default function HistoricalChart({ data, country = '', forecast = null, forecastUnavailable = false }) {
  const svgRef = useRef()
  const tooltipRef = useRef()
  const gaussianBaseline = (forecast?.forecast || [])[0]
  const hasGaussianBaseline = Number.isFinite(gaussianBaseline?.gaussian_mean) && Number.isFinite(gaussianBaseline?.gaussian_stddev)

  useEffect(() => {
    if (!data || data.length === 0) return

    // Hide tooltip at start of each effect run
    hideTooltip(tooltipRef.current)

    const width = 560
    const height = 240
    const margin = { top: 16, right: 90, bottom: 32, left: 48 }

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
      .call(d3.axisBottom(x).ticks(10).tickFormat(d => `W${d}`))
      .style('color', '#636a88')
      .selectAll('text').style('font-family', 'var(--font-mono)').style('font-size', '0.52rem')

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('.2s')))
      .style('color', '#636a88')
      .selectAll('text').style('font-family', 'var(--font-mono)').style('font-size', '0.52rem')

    const line = d3.line()
      .x(d => x(d.week_offset))
      .y(d => y(d.cases))
      .curve(d3.curveMonotoneX)

    // Build lookup maps for tooltip
    const seasonLookup = {}
    seasons.forEach((season) => {
      const points = bySeason.get(season) || []
      const map = new Map()
      points.forEach(d => {
        if (d.week_offset >= 0 && d.week_offset <= 52) {
          map.set(d.week_offset, d.cases)
        }
      })
      seasonLookup[season] = map
    })

    const forecastLookup = new Map()
    fcastPoints.forEach(d => {
      if (d.weekOffset >= 0 && d.weekOffset <= 52) {
        forecastLookup.set(d.weekOffset, d)
      }
    })

    seasons.forEach((season, i) => {
      const points = (bySeason.get(season) || [])
        .filter(d => d.week_offset >= 0 && d.week_offset <= 52)
        .sort((a, b) => a.week_offset - b.week_offset)

      if (points.length === 0) return

      const isCurrent = i === seasons.length - 1
      svg.append('path')
        .datum(points)
        .attr('class', 'season-line')
        .attr('data-season', season)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', seasonColors(season))
        .attr('stroke-width', isCurrent ? 2.5 : 1)
        .attr('opacity', isCurrent ? 1 : 0.4)

      // Legend
      svg.append('text')
        .attr('x', width - margin.right + 6)
        .attr('y', margin.top + i * 12)
        .attr('fill', seasonColors(season))
        .style('font-size', '0.48rem')
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
        const legendY = margin.top + seasons.length * 12
        svg.append('line')
          .attr('x1', width - margin.right + 6)
          .attr('x2', width - margin.right + 16)
          .attr('y1', legendY + 3)
          .attr('y2', legendY + 3)
          .attr('stroke', '#f59e0b')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '3,2')

        svg.append('text')
          .attr('x', width - margin.right + 20)
          .attr('y', legendY + 6)
          .attr('fill', '#f59e0b')
          .style('font-size', '0.48rem')
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

    let selectedSeason = null

    function applySelection(season) {
      svg.selectAll('.season-line').each(function () {
        const el = d3.select(this)
        const s = el.attr('data-season')
        const isCurrent = s === seasons[seasons.length - 1]
        if (season == null) {
          el.attr('stroke-width', isCurrent ? 2.5 : 1)
            .attr('opacity', isCurrent ? 1 : 0.4)
        } else if (s === season) {
          el.attr('stroke-width', 3.5).attr('opacity', 1)
        } else {
          el.attr('stroke-width', 0.8).attr('opacity', 0.15)
        }
      })
    }

    function buildTooltipHtml(clampedWeek, selSeason) {
      let html = `<div style="margin-bottom:4px;color:var(--text-secondary)">Week ${clampedWeek}</div>`
      seasons.forEach((season) => {
        const color = seasonColors(season)
        const val = seasonLookup[season]?.get(clampedWeek)
        if (val == null) return
        const isSelected = selSeason != null && season === selSeason
        const isDimmed = selSeason != null && season !== selSeason
        const rowStyle = isSelected
          ? 'font-weight:700;padding-left:6px;border-left:2px solid var(--accent-cyan)'
          : ''
        const valColor = isDimmed ? 'var(--text-dim)' : 'var(--text-primary)'
        const labelColor = isDimmed ? 'var(--text-dim)' : 'var(--text-secondary)'
        html += `<div style="display:flex;align-items:center;gap:6px;${rowStyle}">`
        html += `<span style="width:12px;height:2px;background:${color};flex-shrink:0"></span>`
        html += `<span style="color:${labelColor}">${season}:</span> `
        html += `<span style="color:${valColor};margin-left:auto">${formatValue(val)}</span>`
        html += `</div>`
      })

      const fc = forecastLookup.get(clampedWeek)
      if (fc) {
        const isDimmed = selSeason != null && selSeason !== '__forecast__'
        const valColor = isDimmed ? 'var(--text-dim)' : 'var(--text-primary)'
        const labelColor = isDimmed ? 'var(--text-dim)' : '#f59e0b'
        html += `<div style="display:flex;align-items:center;gap:6px;margin-top:2px">`
        html += `<span style="width:12px;height:2px;background:#f59e0b;flex-shrink:0;border-top:1px dashed #f59e0b"></span>`
        html += `<span style="color:${labelColor}">Forecast:</span> `
        html += `<span style="color:${valColor};margin-left:auto">${formatValue(fc.forecast)}</span>`
        html += `</div>`
      }
      return html
    }

    // --- Crosshair + Tooltip interactivity ---
    const crosshair = svg.append('line')
      .attr('class', 'crosshair')
      .attr('y1', margin.top)
      .attr('y2', height - margin.bottom)
      .attr('stroke', 'var(--text-dim)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,3')
      .style('opacity', 0)

    let pinned = false

    svg.append('rect')
      .attr('class', 'overlay')
      .attr('x', margin.left)
      .attr('y', margin.top)
      .attr('width', width - margin.left - margin.right)
      .attr('height', height - margin.top - margin.bottom)
      .attr('fill', 'transparent')
      .attr('cursor', 'crosshair')
      .on('mousemove', function (event) {
        if (pinned) return
        const [mx] = d3.pointer(event, this)
        const week = Math.round(x.invert(mx + margin.left))
        const clampedWeek = Math.max(0, Math.min(52, week))
        const cx = x(clampedWeek)

        crosshair.attr('x1', cx).attr('x2', cx).style('opacity', 1)

        const tooltipEl = tooltipRef.current
        if (!tooltipEl) return

        tooltipEl.innerHTML = buildTooltipHtml(clampedWeek, selectedSeason)
        showTooltip(tooltipEl)
        positionTooltip(tooltipEl, svgRef.current, cx, margin.top)
      })
      .on('mouseleave', function () {
        if (pinned) return
        crosshair.style('opacity', 0)
        hideTooltip(tooltipRef.current)
      })
      .on('click', function (event) {
        if (pinned) {
          pinned = false
          selectedSeason = null
          applySelection(null)
          crosshair
            .attr('stroke', 'var(--text-dim)')
            .attr('stroke-dasharray', '4,3')
          const [mx] = d3.pointer(event, this)
          if (mx < 0 || mx > width - margin.left - margin.right) {
            crosshair.style('opacity', 0)
            hideTooltip(tooltipRef.current)
          }
        } else {
          pinned = true
          crosshair
            .attr('stroke', 'var(--accent-cyan)')
            .attr('stroke-dasharray', 'none')

          // Detect closest season to click position (pointer in viewBox coords)
          const [svgX, svgY] = d3.pointer(event, svg.node())
          const week = Math.round(x.invert(svgX))
          const clampedWeek = Math.max(0, Math.min(52, week))
          const mouseY = svgY

          let bestSeason = null
          let bestDist = Infinity
          seasons.forEach((season) => {
            const val = seasonLookup[season]?.get(clampedWeek)
            if (val == null) return
            const dist = Math.abs(y(val) - mouseY)
            if (dist < bestDist) {
              bestDist = dist
              bestSeason = season
            }
          })

          // Also check forecast
          const fc = forecastLookup.get(clampedWeek)
          if (fc) {
            const dist = Math.abs(y(fc.forecast) - mouseY)
            if (dist < bestDist) {
              bestDist = dist
              bestSeason = '__forecast__'
            }
          }

          selectedSeason = bestSeason
          applySelection(selectedSeason)

          // Re-render tooltip with selection
          const tooltipEl = tooltipRef.current
          if (tooltipEl) {
            tooltipEl.innerHTML = buildTooltipHtml(clampedWeek, selectedSeason)
          }
        }
      })
  }, [data, forecast])

  if (!data) {
    return <SkeletonChart height={180} />
  }

  return (
    <div className="card-analytics fade-in-up stagger-1" style={{ padding: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
        <h3 style={{
          fontSize: '0.75rem',
          color: 'var(--text-primary)',
          margin: 0,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Season Comparison
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.65rem' }}>
            {country ? `(${country})` : '(Global)'}
          </span>
        </h3>
        {forecastUnavailable && (
          <span className="badge badge-muted" style={{ fontSize: '0.62rem' }}>
            forecast unavailable
          </span>
        )}
        {hasGaussianBaseline && (
          <span style={{
            fontSize: '0.62rem',
            color: 'var(--text-dim)',
            fontFamily: 'var(--font-mono)',
          }}>
            {`\u03BC ${gaussianBaseline.gaussian_mean.toFixed(1)} \u03C3 ${gaussianBaseline.gaussian_stddev.toFixed(1)}`}
          </span>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <svg ref={svgRef} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Line chart comparing historical seasonal flu cases with forecast" />
        <ChartTooltip ref={tooltipRef} />
      </div>
    </div>
  )
}
