import React, { forwardRef } from 'react'

const ChartTooltip = forwardRef(function ChartTooltip(_props, ref) {
  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        opacity: 0,
        visibility: 'hidden',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-hover)',
        borderRadius: 'var(--radius-sm)',
        padding: '8px 10px',
        fontSize: '0.62rem',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-primary)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        zIndex: 10,
        whiteSpace: 'nowrap',
        transition: 'opacity 0.12s ease',
        lineHeight: 1.5,
      }}
    />
  )
})

export default ChartTooltip
