import { formatValue, formatDate, showTooltip, hideTooltip } from '../utils/tooltipHelpers'

describe('tooltipHelpers', () => {
  describe('formatValue', () => {
    it('formats numbers with commas', () => {
      expect(formatValue(1234)).toBe('1,234')
    })

    it('returns dash for null', () => {
      expect(formatValue(null)).toBe('—')
    })
  })

  describe('formatDate', () => {
    it('formats Date objects', () => {
      expect(formatDate(new Date('2024-03-15'))).toMatch(/Mar/)
    })

    it('converts non-Date to string', () => {
      expect(formatDate('Week 5')).toBe('Week 5')
    })
  })

  describe('showTooltip', () => {
    it('sets opacity and visibility on the element', () => {
      const el = document.createElement('div')
      showTooltip(el)
      expect(el.style.opacity).toBe('1')
      expect(el.style.visibility).toBe('visible')
    })

    it('is a no-op when element is null', () => {
      expect(() => showTooltip(null)).not.toThrow()
    })
  })

  describe('hideTooltip', () => {
    it('sets opacity and visibility on the element', () => {
      const el = document.createElement('div')
      hideTooltip(el)
      expect(el.style.opacity).toBe('0')
      expect(el.style.visibility).toBe('hidden')
    })

    it('is a no-op when element is null', () => {
      expect(() => hideTooltip(null)).not.toThrow()
    })
  })
})
