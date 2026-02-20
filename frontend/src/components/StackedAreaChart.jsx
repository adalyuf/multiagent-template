import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { SkeletonChart } from './Skeleton'
import ChartTooltip from './ChartTooltip'
import { positionTooltip, showTooltip, hideTooltip, formatDate, formatValue } from '../utils/tooltipHelpers'

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
  icon = null,
}) {
  const svgRef = useRef()
  const tooltipRef = useRef()

  useEffect(() => {
    if (!data || data.length === 0 || !keys || keys.length === 0) return

    // Hide tooltip at start of each effect run
    hideTooltip(tooltipRef.current)

    const width = 440
    const height = 200
    const margin = { top: 12, right: 10, bottom: 32, left: 48 }

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
      .call(d3.axisBottom(x).ticks(5))
      .style('color', '#636a88')
      .selectAll('text').style('font-family', 'var(--font-mono)').style('font-size', '0.5rem')

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('.2s')))
      .style('color', '#636a88')
      .selectAll('text').style('font-family', 'var(--font-mono)').style('font-size', '0.5rem')

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

    let selectedKey = null

    function applySelection(key) {
      svg.selectAll('.layer')
        .attr('opacity', d => key == null ? 0.8 : (d.key === key ? 1 : 0.35))
        .attr('stroke', d => (key != null && d.key === key) ? '#fff' : null)
        .attr('stroke-width', d => (key != null && d.key === key) ? 1.5 : null)
    }

    function buildTooltipHtml(row, selKey) {
      let html = `<div style="margin-bottom:4px;color:var(--text-secondary)">${formatDate(row.date)}</div>`
      keys.forEach((k) => {
        const color = resolveColor(colorScale, k)
        const isSelected = selKey != null && k === selKey
        const isDimmed = selKey != null && k !== selKey
        const rowStyle = isSelected
          ? 'font-weight:700;padding-left:6px;border-left:2px solid var(--accent-cyan)'
          : ''
        const valColor = isDimmed ? 'var(--text-dim)' : 'var(--text-primary)'
        const labelColor = isDimmed ? 'var(--text-dim)' : 'var(--text-secondary)'
        html += `<div style="display:flex;align-items:center;gap:6px;${rowStyle}">`
        html += `<span style="width:8px;height:8px;border-radius:1px;background:${color};flex-shrink:0"></span>`
        html += `<span style="color:${labelColor}">${k}:</span> `
        html += `<span style="color:${valColor};margin-left:auto">${formatValue(row[k])}</span>`
        html += `</div>`
      })
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

    const bisectDate = d3.bisector((d) => d.date).left

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
        const xDate = x.invert(mx + margin.left)
        let idx = bisectDate(matrix, xDate, 1)
        if (idx >= matrix.length) idx = matrix.length - 1
        if (idx > 0) {
          const d0 = matrix[idx - 1]
          const d1 = matrix[idx]
          if (xDate - d0.date > d1.date - xDate) idx = idx
          else idx = idx - 1
        }
        const row = matrix[idx]
        if (!row) return

        const cx = x(row.date)
        crosshair.attr('x1', cx).attr('x2', cx).style('opacity', 1)

        // Build tooltip content
        const tooltipEl = tooltipRef.current
        if (!tooltipEl) return

        tooltipEl.innerHTML = buildTooltipHtml(row, selectedKey)

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
          selectedKey = null
          applySelection(null)
          crosshair
            .attr('stroke', 'var(--text-dim)')
            .attr('stroke-dasharray', '4,3')
          // Trigger a synthetic mousemove to update position or hide
          const [mx] = d3.pointer(event, this)
          // If mouse is outside chart, hide
          if (mx < 0 || mx > width - margin.left - margin.right) {
            crosshair.style('opacity', 0)
            hideTooltip(tooltipRef.current)
          }
        } else {
          pinned = true
          crosshair
            .attr('stroke', 'var(--accent-cyan)')
            .attr('stroke-dasharray', 'none')

          // Detect which layer was clicked (pointer in viewBox coords)
          const [svgX, svgY] = d3.pointer(event, svg.node())
          const xDate = x.invert(svgX)
          let idx = bisectDate(matrix, xDate, 1)
          if (idx >= matrix.length) idx = matrix.length - 1
          if (idx > 0) {
            const d0 = matrix[idx - 1]
            const d1 = matrix[idx]
            if (xDate - d0.date > d1.date - xDate) idx = idx
            else idx = idx - 1
          }
          const mouseY = svgY
          selectedKey = null
          for (let li = 0; li < stacked.length; li++) {
            const layer = stacked[li]
            const top_ = y(layer[idx][1])
            const bot_ = y(layer[idx][0])
            if (mouseY >= top_ && mouseY <= bot_) {
              selectedKey = layer.key
              break
            }
          }
          applySelection(selectedKey)

          // Re-render tooltip with selection
          const row = matrix[idx]
          if (row) {
            const tooltipEl = tooltipRef.current
            if (tooltipEl) {
              tooltipEl.innerHTML = buildTooltipHtml(row, selectedKey)
            }
          }
        }
      })
  }, [colorScale, data, keys, seriesAccessor, xAccessor, yAccessor])

  if (!data || data.length === 0) {
    return <SkeletonChart height={160} />
  }

  return (
    <div className="card-analytics fade-in-up" style={{ padding: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <h3 style={{
          fontSize: '0.75rem',
          color: 'var(--text-primary)',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          {icon}
          {title}
        </h3>
        {headerAction}
      </div>
      <div style={{ position: 'relative' }}>
        <svg
          ref={svgRef}
          style={{ width: '100%', height: 'auto' }}
          role="img"
          aria-label={ariaLabel || title}
        />
        <ChartTooltip ref={tooltipRef} />
      </div>
      {/* HTML legend — flush right */}
      {keys && keys.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '6px 14px',
          marginTop: 8,
        }}>
          {keys.map((key) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: resolveColor(colorScale, key),
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: '0.62rem',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-display)',
                whiteSpace: 'nowrap',
              }}>
                {key}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
