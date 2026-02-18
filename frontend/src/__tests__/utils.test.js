import { buildIsoMap, numericToIso } from '../utils/isoMap'
import { getSeasonLabel, parseSeason } from '../utils/seasons'

describe('season utils', () => {
  it('parses an October date into the new season', () => {
    expect(parseSeason('2025-10-15')).toEqual({
      season: '2025/2026',
      weekOffset: 2,
    })
  })

  it('returns season labels', () => {
    expect(getSeasonLabel(2024)).toBe('2024/2025')
  })
})

describe('iso map utils', () => {
  it('maps known numeric ids to ISO2', () => {
    expect(numericToIso(840)).toBe('US')
    expect(numericToIso(826)).toBe('GB')
  })

  it('returns null for unknown numeric ids', () => {
    expect(numericToIso(999999)).toBeNull()
  })

  it('exposes a map object with known entries', () => {
    const map = buildIsoMap()
    expect(map[840]).toBe('US')
    expect(map[356]).toBe('IN')
  })
})
