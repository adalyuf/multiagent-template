import * as d3 from 'd3'

const fmt = d3.format(',.0f')
const dateFmt = d3.timeFormat('%b %d, %Y')

export function formatValue(v) {
  return v == null ? '—' : fmt(v)
}

export function formatDate(d) {
  return d instanceof Date ? dateFmt(d) : String(d)
}

/**
 * Position a tooltip element relative to a wrapper div that contains both
 * the SVG and the tooltip. Converts SVG viewBox coordinates to pixel
 * coordinates and flips the tooltip to stay in bounds.
 *
 * @param {HTMLElement} tooltipEl  – the tooltip DOM node
 * @param {SVGSVGElement} svgEl   – the <svg> element (with viewBox)
 * @param {number} svgX           – x in viewBox coords
 * @param {number} svgY           – y in viewBox coords
 */
export function positionTooltip(tooltipEl, svgEl, svgX, svgY) {
  const svgRect = svgEl.getBoundingClientRect()
  const vb = svgEl.viewBox.baseVal
  if (!vb || vb.width === 0) return

  const scaleX = svgRect.width / vb.width
  const scaleY = svgRect.height / vb.height

  let px = svgX * scaleX
  let py = svgY * scaleY

  const tt = tooltipEl
  const ttW = tt.offsetWidth
  const ttH = tt.offsetHeight

  // offset from cursor
  const pad = 12

  // default: right of cursor
  let left = px + pad
  // flip left if clipping right edge
  if (left + ttW > svgRect.width) {
    left = px - ttW - pad
  }
  // clamp
  if (left < 0) left = 0

  // default: above cursor
  let top = py - ttH - pad + svgRect.top - svgRect.top // relative to wrapper
  top = py - ttH - pad
  if (top < 0) top = py + pad
  // clamp
  if (top + ttH > svgRect.height) top = svgRect.height - ttH

  tt.style.left = `${left}px`
  tt.style.top = `${top}px`
}

export function showTooltip(tooltipEl) {
  if (tooltipEl) {
    tooltipEl.style.opacity = '1'
    tooltipEl.style.pointerEvents = 'none'
    tooltipEl.style.visibility = 'visible'
  }
}

export function hideTooltip(tooltipEl) {
  if (tooltipEl) {
    tooltipEl.style.opacity = '0'
    tooltipEl.style.visibility = 'hidden'
  }
}
