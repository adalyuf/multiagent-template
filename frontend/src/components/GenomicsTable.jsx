import React from 'react'

export default function GenomicsTable({ data }) {
  if (!data || data.length === 0) return null

  return (
    <div className="card fade-in-up stagger-2">
      <h3 style={{
        fontSize: '0.82rem',
        color: 'var(--text-secondary)',
        marginBottom: 14,
        fontWeight: 600,
      }}>
        Top Countries by Sequences
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Country</th>
              <th>Sequences</th>
              <th>Top Clade</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={r.country_code} style={{ cursor: 'default' }}>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{i + 1}</td>
                <td style={{ fontWeight: 500 }}>{r.country_code}</td>
                <td className="mono">{r.total_sequences?.toLocaleString()}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{r.top_clade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
