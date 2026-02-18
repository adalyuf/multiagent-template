import { useState, useEffect } from 'react'

const RETRYABLE_ERROR_RE = /(failed to fetch|networkerror|load failed|api error: (502|503|504))/i

function isRetryableError(error) {
  return RETRYABLE_ERROR_RE.test(String(error?.message || ''))
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function useApi(fetcher, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const run = async () => {
      let lastError = null
      const maxAttempts = 4

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const result = await fetcher()
          if (!cancelled) setData(result)
          return
        } catch (e) {
          lastError = e
          const retryable = isRetryableError(e)
          const canRetry = retryable && attempt < maxAttempts
          if (!canRetry) break
          await delay(500 * attempt)
          if (cancelled) return
        }
      }

      if (!cancelled) setError(lastError)
    }

    run()
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, deps)

  return { data, loading, error }
}
