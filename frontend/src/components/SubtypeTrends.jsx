import React from 'react'
import { subtypeColors } from '../utils/colors'
import StackedAreaChart from './StackedAreaChart'

export default function SubtypeTrends({ data }) {
  const subtypes = [...new Set((data || []).map((d) => d.subtype))]

  return <StackedAreaChart
    data={data}
    keys={subtypes}
    colorScale={subtypeColors}
    xAccessor={(d) => d.date}
    yAccessor={(d) => d.cases}
    seriesAccessor={(d) => d.subtype}
    title="Subtype Trends (1 year)"
  />
}
