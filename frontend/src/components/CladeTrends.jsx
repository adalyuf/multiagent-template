import React from 'react'
import { cladeColors } from '../utils/colors'
import { Link } from 'react-router-dom'
import StackedAreaChart from './StackedAreaChart'

export default function CladeTrends({ data }) {
  const clades = [...new Set((data || []).map((d) => d.clade))]

  return <StackedAreaChart
    data={data}
    keys={clades}
    colorScale={cladeColors}
    xAccessor={(d) => d.date}
    yAccessor={(d) => d.count}
    seriesAccessor={(d) => d.clade}
    title="Clade Trends (1 year)"
    ariaLabel="Stacked area chart showing clade trends over time"
    headerAction={<Link to="/genomics" style={{
      fontSize: '0.72rem',
      color: 'var(--accent-cyan)',
      textDecoration: 'none',
      fontWeight: 500,
      transition: 'opacity 0.15s ease',
    }}>
      View Genomics Dashboard &rarr;
    </Link>}
  />
}
