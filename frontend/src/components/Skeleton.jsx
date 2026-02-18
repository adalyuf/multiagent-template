import React from 'react'

export function SkeletonBlock({ width = '100%', height = 16, style = {} }) {
  return <div className="skeleton" style={{ width, height, ...style }} />
}

export function SkeletonKpi() {
  return (
    <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
      <SkeletonBlock width="50%" height={28} style={{ margin: '0 auto 8px' }} />
      <SkeletonBlock width="35%" height={10} style={{ margin: '0 auto' }} />
    </div>
  )
}

export function SkeletonChart({ height = 240 }) {
  return (
    <div className="card">
      <SkeletonBlock width="35%" height={14} style={{ marginBottom: 12 }} />
      <SkeletonBlock width="100%" height={height} />
    </div>
  )
}

export function SkeletonTable({ rows = 6 }) {
  return (
    <div className="card">
      <SkeletonBlock width="25%" height={14} style={{ marginBottom: 16 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
          <SkeletonBlock width="6%" height={12} />
          <SkeletonBlock width="18%" height={12} />
          <SkeletonBlock width="14%" height={12} />
          <SkeletonBlock width="10%" height={12} />
          <SkeletonBlock width="12%" height={12} />
          <SkeletonBlock width="16%" height={12} />
          <SkeletonBlock width="10%" height={12} />
        </div>
      ))}
    </div>
  )
}
