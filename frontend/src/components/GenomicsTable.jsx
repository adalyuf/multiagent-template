import React from 'react'
import { cardContainerStyle, tableStyles } from '../utils/tableStyles'

export default function GenomicsTable({ data }) {
  if (!data || data.length === 0) return null

  return (
    <div style={cardContainerStyle}>
      <h3 style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: 12 }}>Top Countries by Sequences</h3>
      <table style={tableStyles.table}>
        <thead>
          <tr>
            <th style={tableStyles.th}>#</th>
            <th style={tableStyles.th}>Country</th>
            <th style={tableStyles.th}>Sequences</th>
            <th style={tableStyles.th}>Top Clade</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={r.country_code}>
              <td style={{ ...tableStyles.td, color: '#ccc' }}>{i + 1}</td>
              <td style={{ ...tableStyles.td, color: '#ccc' }}>{r.country_code}</td>
              <td style={{ ...tableStyles.td, color: '#ccc' }}>{r.total_sequences?.toLocaleString()}</td>
              <td style={{ ...tableStyles.td, color: '#ccc' }}>{r.top_clade}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
