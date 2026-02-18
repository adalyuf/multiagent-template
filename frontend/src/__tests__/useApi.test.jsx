import { renderHook, waitFor } from '@testing-library/react'
import { useApi } from '../hooks/useApi'

describe('useApi', () => {
  it('handles loading and successful response', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true })
    const { result } = renderHook(() => useApi(fetcher, []))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toEqual({ ok: true })
    expect(result.current.error).toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('captures fetch errors', async () => {
    const error = new Error('boom')
    const fetcher = vi.fn().mockRejectedValue(error)
    const { result } = renderHook(() => useApi(fetcher, []))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe(error)
  })

  it('retries transient API failures', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('API error: 504'))
      .mockResolvedValueOnce({ ok: true })

    const { result } = renderHook(() => useApi(fetcher, []))

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(result.current.data).toEqual({ ok: true })
    expect(result.current.error).toBeNull()
  })
})
