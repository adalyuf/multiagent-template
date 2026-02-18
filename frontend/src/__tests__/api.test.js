import { api } from '../api'

describe('api client', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls summary endpoint', async () => {
    await api.summary()
    expect(fetch).toHaveBeenCalledWith('/api/cases/summary')
  })

  it('calls countries endpoint with params', async () => {
    await api.countries('search=US&sort=cases')
    expect(fetch).toHaveBeenCalledWith('/api/cases/countries?search=US&sort=cases')
  })

  it('calls historical endpoint with params', async () => {
    await api.historical('country=US')
    expect(fetch).toHaveBeenCalledWith('/api/cases/historical?country=US')
  })

  it('calls forecast endpoint with params', async () => {
    await api.forecast('country=US&weeks=6')
    expect(fetch).toHaveBeenCalledWith('/api/forecast?country=US&weeks=6')
  })

  it('throws when response is not ok', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 503 })
    await expect(api.summary()).rejects.toThrow('API error: 503')
  })
})
